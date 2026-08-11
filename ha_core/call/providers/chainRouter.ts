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

        // Build scoring debug + telemetry
        const debug = ChainScoringUI.build(
            config,
            session,
            this.cache,
            this.memory,
        );
        console.log(ChainScoringUI.print(debug));

        for (const entry of debug) {
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
            });
        }

        // Build chain order
        this.chain = entries
            .map(([providerName, metrics]) => {
                const safeMetrics = metrics ?? {};
                const score = scoreProvider(safeMetrics, config.weights);

                const boosted =
                    mem && mem.provider === providerName
                        ? score + mem.score * 0.5
                        : score;

                return { providerName, score: boosted };
            })
            .sort((a, b) => b.score - a.score)
            .map((x) => x.providerName);
    }

    private getAdapter(name: string): ProviderAdapter {
        const adapter = providers[name];
        if (!adapter) throw new Error(`Unknown provider: ${name}`);
        return adapter;
    }

    async call(req: ProviderRequest): Promise<ProviderResponse> {
        for (const providerName of this.chain) {
            // Cache skip
            if (this.cache.isCached(providerName)) {
                this.telemetry.record({
                    session: req.session,
                    provider: providerName,
                    stage: "cache_skip",
                    cached: true,
                    error:
                        this.cache.getReason(providerName) ?? "recent failure",
                });
                continue;
            }

            // Attempt call
            this.telemetry.record({
                session: req.session,
                provider: providerName,
                stage: "call",
            });

            try {
                const adapter = this.getAdapter(providerName);
                const res = await adapter.call(req);

                // Score + memory
                const metrics = this.config.metrics[providerName] ?? {};
                const score = scoreProvider(metrics, this.config.weights);
                this.memory.remember(req.session, providerName, score);

                this.telemetry.record({
                    session: req.session,
                    provider: providerName,
                    stage: "call",
                    finalScore: score,
                    response: res,
                });

                logProviderIO(req.session, providerName, req, res);
                return res;
            } catch (err: any) {
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

                // Cache failure
                this.cache.markFailure(providerName, pe.message);

                this.telemetry.record({
                    session: req.session,
                    provider: providerName,
                    stage: "failure",
                    error: pe.message,
                    retryCount: pe.retryCount,
                    retryDelay: pe.retryDelay,
                });

                logProviderIO(req.session, providerName, req, {
                    role: "assistant",
                    content: `[chain provider error: ${pe.type} - ${pe.message}]`,
                });

                // Retry logic
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

                    this.telemetry.record({
                        session: req.session,
                        provider: providerName,
                        stage: "retry",
                        error: pe.message,
                        retryCount: retryErr.retryCount,
                        retryDelay: retryErr.retryDelay,
                    });

                    await new Promise((r) =>
                        setTimeout(r, retryErr.retryDelay ?? 0),
                    );

                    try {
                        const adapter = this.getAdapter(providerName);
                        const res = await adapter.call(req);
                        return res;
                    } catch {
                        // continue to next provider
                    }
                }
            }
        }

        // Final failure telemetry
        this.telemetry.record({
            session: req.session,
            provider: "chain",
            stage: "failure",
            error: `provider chain failure: ${this.chain.join(" → ")}`,
        });

        return normalizeProviderResponse(
            `[provider chain failure: ${this.chain.join(" → ")}]`,
            "assistant",
        );
    }

    getTelemetry() {
        return this.telemetry.getSession(this.session);
    }
}
