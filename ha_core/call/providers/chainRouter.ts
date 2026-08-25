import type {
    ProviderAdapter,
    ProviderRequest,
    ProviderResponse,
} from "./interface.js";

import { providers } from "./index.js";
import { providerError, ProviderError } from "./errors.js";
import { normalizeProviderResponse } from "./providerNormalize.js";
import { logProviderIO } from "./utils.js";
import { ProviderChainCache } from "./chainCache.js";
import { ProviderChainMemory } from "./chainMemory.js";
import { ChainScoringUI } from "./chainScoreUI.js";
import { ProviderChainTelemetry } from "./chainTelemetry.js";
import { ChainScoreDashboard } from "./chainScoreDashboard.js";
import { timeoutGuard, safeTelemetry } from "./timeout.js";

export interface ProviderMetrics {
    speed: number;
    cost: number;
    depth: number;
    quality: number;
    reliability: number;
}

export interface ProviderChainConfig {
    metrics: Record<string, Partial<ProviderMetrics>>;
    weights: ProviderMetrics;
}

export function safeMetric(value: number | undefined): number {
    return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}

export function scoreProvider(
    metrics: Partial<ProviderMetrics>,
    weights: ProviderMetrics,
): number {
    return (
        safeMetric(metrics.speed) * weights.speed +
        safeMetric(metrics.cost) * weights.cost +
        safeMetric(metrics.depth) * weights.depth +
        safeMetric(metrics.quality) * weights.quality +
        safeMetric(metrics.reliability) * weights.reliability
    );
}

const CHAIN_TIMEOUT_MS = 60000; // 60s global cap
const PROVIDER_TIMEOUT_MS = 20000; // 20s per-provider cap

export class ProviderChainRouter {
    private chain: string[];
    private cache = new ProviderChainCache();
    private memory = new ProviderChainMemory();
    private telemetry = new ProviderChainTelemetry();
    private config: ProviderChainConfig;
    private session: string;

    constructor(config: ProviderChainConfig, session: string) {
        this.config = config;
        this.session = session;

        const entries = Object.entries(config.metrics);
        const mem = this.memory.recall(session);

        const debug = ChainScoringUI.build(
            config,
            session,
            this.cache,
            this.memory,
        );

        console.log(ChainScoringUI.print(debug));
        console.log(ChainScoreDashboard.html(debug));

        for (const entry of debug) {
            safeTelemetry(() =>
                this.telemetry.record({
                    session,
                    provider: entry.provider,
                    stage: "scoring",
                    score: entry.rawScore,
                    metrics: entry.metrics as Record<string, number>,
                    weighted: entry.weighted,
                    memoryBoost: entry.memoryBoost,
                    finalScore: entry.finalScore,
                    cached: entry.cached,
                }),
            );
        }

        const sorted = entries
            .map(([providerName, metrics]) => {
                const safeMetrics = metrics ?? {};
                const score = scoreProvider(safeMetrics, config.weights);

                const boosted =
                    mem && mem.provider === providerName
                        ? score + mem.score * 0.5
                        : score;

                return { providerName, score: boosted };
            })
            .sort((a, b) => b.score - a.score);

        const top = sorted[0];
        if (top) {
            safeTelemetry(() =>
                this.telemetry.record({
                    session,
                    provider: top.providerName,
                    stage: "selection",
                    score: top.score,
                }),
            );
        }

        this.chain = sorted.map((x) => x.providerName);
    }

    private getAdapter(name: string): ProviderAdapter {
        const adapter = providers[name];
        if (!adapter) throw new Error(`Unknown provider: ${name}`);
        return adapter;
    }

    async call(req: ProviderRequest): Promise<ProviderResponse> {
        const chainStart = Date.now();

        const checkChainTimeout = () => {
            if (Date.now() - chainStart > CHAIN_TIMEOUT_MS) {
                throw providerError(
                    "timeout",
                    "chain",
                    req.model,
                    req.session,
                    "Global provider chain timeout",
                );
            }
        };

        for (const providerName of this.chain) {
            checkChainTimeout();

            if (this.cache.isHit(providerName)) {
                safeTelemetry(() =>
                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "cache_hit",
                        cached: true,
                        response: this.cache.get(providerName),
                    }),
                );
            }

            if (this.cache.isCached(providerName)) {
                safeTelemetry(() =>
                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "cache_skip",
                        cached: true,
                        error:
                            this.cache.getReason(providerName) ??
                            "recent failure",
                    }),
                );
                continue;
            }

            safeTelemetry(() =>
                this.telemetry.record({
                    session: req.session,
                    provider: providerName,
                    stage: "adapter",
                }),
            );

            safeTelemetry(() =>
                this.telemetry.record({
                    session: req.session,
                    provider: providerName,
                    stage: "call",
                }),
            );

            try {
                const adapter = this.getAdapter(providerName);
                const raw = await timeoutGuard(
                    adapter.call(req),
                    PROVIDER_TIMEOUT_MS,
                    `provider-${providerName}`,
                );

                const metrics = this.config.metrics[providerName] ?? {};
                const score = scoreProvider(metrics, this.config.weights);
                this.memory.remember(req.session, providerName, score);

                safeTelemetry(() =>
                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "routing",
                        metrics,
                    }),
                );

                safeTelemetry(() =>
                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "call",
                        finalScore: score,
                        response: raw,
                    }),
                );

                const normalized = normalizeProviderResponse(
                    raw.content,
                    raw.role,
                );

                safeTelemetry(() =>
                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "normalize",
                        response: normalized,
                    }),
                );

                logProviderIO(req.session, providerName, req, normalized);
                return normalized;
            } catch (err: any) {
                safeTelemetry(() =>
                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "adapter_error",
                        error: err?.message ?? String(err),
                    }),
                );

                const pe: ProviderError = err?.type
                    ? err
                    : providerError(
                          "internal",
                          providerName,
                          req.model,
                          req.session,
                          String(err?.message ?? err),
                          err,
                      );

                if (pe.type === "timeout") {
                    const metrics = this.config.metrics[providerName] ?? {};
                    metrics.reliability = Math.max(
                        0,
                        safeMetric(metrics.reliability) - 0.2,
                    );
                    this.memory.remember(req.session, providerName, -1);
                }

                this.cache.markFailure(providerName, pe.message);

                safeTelemetry(() =>
                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "failure",
                        error: pe.message,
                        retryCount: pe.retryCount,
                        retryDelay: pe.retryDelay,
                    }),
                );

                logProviderIO(req.session, providerName, req, {
                    role: "assistant",
                    content: `[chain provider error: ${pe.type} - ${pe.message}]`,
                });

                safeTelemetry(() =>
                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "fallback",
                        error: pe.message,
                    }),
                );

                if (pe.retryable && (pe.retryCount ?? 0) < 2) {
                    const retryErr = providerError(
                        pe.type,
                        pe.provider,
                        pe.model,
                        pe.session,
                        pe.message,
                        pe.cause,
                        (pe.retryCount ?? 0) + 1,
                    );

                    safeTelemetry(() =>
                        this.telemetry.record({
                            session: req.session,
                            provider: providerName,
                            stage: "retry",
                            error: pe.message,
                            retryCount: retryErr.retryCount,
                            retryDelay: retryErr.retryDelay,
                        }),
                    );

                    await new Promise((r) =>
                        setTimeout(r, retryErr.retryDelay ?? 0),
                    );

                    try {
                        const adapter = this.getAdapter(providerName);
                        const res = await timeoutGuard(
                            adapter.call(req),
                            PROVIDER_TIMEOUT_MS,
                            `retry-${providerName}`,
                        );

                        const normalized = normalizeProviderResponse(
                            res.content,
                            res.role,
                        );

                        safeTelemetry(() =>
                            this.telemetry.record({
                                session: req.session,
                                provider: providerName,
                                stage: "normalize",
                                response: normalized,
                            }),
                        );

                        logProviderIO(
                            req.session,
                            providerName,
                            req,
                            normalized,
                        );
                        return normalized;
                    } catch {
                        // continue to next provider
                    }
                }
            }
        }

        safeTelemetry(() =>
            this.telemetry.record({
                session: req.session,
                provider: "chain",
                stage: "failure",
                error: `provider chain failure: ${this.chain.join(" → ")}`,
            }),
        );

        safeTelemetry(() =>
            this.telemetry.record({
                session: req.session,
                provider: "chain",
                stage: "normalize",
                response: `[provider chain failure: ${this.chain.join(" → ")}]`,
            }),
        );

        safeTelemetry(() =>
            this.telemetry.record({
                session: req.session,
                provider: "chain",
                stage: "finalize",
                chain: this.chain.join(" → "),
            }),
        );

        return normalizeProviderResponse(
            `[provider chain failure: ${this.chain.join(" → ")}]`,
            "assistant",
        );
    }

    getTelemetry() {
        return this.telemetry.getSession(this.session);
    }
}
