import type { SMAGEMessage } from "../ha_core/index.js";
import { SMAGEAgent } from "./agent.js";
import { SMAGEMultiAgent } from "./multi_agent.js";
import { learn } from "../ha_learn/index.js";
import { ProviderSelector } from "./providerSelection.js";
import { ProviderFallback } from "./providerFallback.js";
import { ResponseBlender } from "./responseBlender.js";
import { MemoryRouter } from "./memoryRouting.js";
import { ProviderReliabilityTracker } from "./providerReliability.js";
import { ProviderRouter } from "../ha_core/call/providers/router.js";
import { ProviderChainRouter } from "../ha_core/call/providers/chainRouter.js";
import { ProviderChainTelemetry } from "../ha_core/call/providers/chainTelemetry.js";
import { CCRPipeline } from "../ha_core/transform/ccr/pipeline.js";
import {
    timeoutGuard,
    safeTelemetry,
} from "../ha_core/call/providers/timeout.js";

const ORCHESTRATOR_TIMEOUT_MS = 90_000; // per agent cap 90s
const CCR_TIMEOUT_MS = 30_000; // CCR cap 30s
export interface OrchestratorConfig {
    session: string;
    strategy: "single" | "round_robin" | "fan_out" | "auto";
    agents: {
        id: string;
        provider: string;
        model: string;
        speed?: number;
        cost?: number;
        depth?: number;
        quality?: number;
        options?: Record<string, unknown> | undefined;
    }[];
}

export interface OrchestratorResult {
    agentId: string;
    role: string;
    content: string;
}
// Orchestrator-level telemetry
export const orchestratorTelemetry = new ProviderChainTelemetry();
export class SMAGEOrchestrator {
    private config: OrchestratorConfig;
    private single: SMAGEAgent;
    private multi: SMAGEMultiAgent;
    private selector = new ProviderSelector();
    private fallback = new ProviderFallback();
    private blender = new ResponseBlender();
    private router = new MemoryRouter();
    private tracker = new ProviderReliabilityTracker();
    private providerRouter: ProviderRouter;
    private deduped: SMAGEMessage[] = []; // Store deduped messages for telemetry
    private telemetry: ProviderChainTelemetry;

    constructor(config: OrchestratorConfig) {
        if (config.agents.length === 0) {
            throw new Error("Orchestrator requires at least one agent.");
        }

        this.config = config;
        this.single = new SMAGEAgent();
        this.multi = new SMAGEMultiAgent(config.agents);
        this.telemetry = orchestratorTelemetry;

        const primary = config.agents[0]?.provider ?? "openai";
        const fallbackProvider =
            typeof config.agents[0]?.options?.fallback === "string"
                ? config.agents[0].options.fallback
                : "anthropic";

        this.providerRouter = new ProviderRouter(primary, fallbackProvider);
    }

    async orchestrate(messages: SMAGEMessage[]): Promise<OrchestratorResult> {
        const { session, strategy, agents } = this.config;

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const userQuery = lastUser?.content ?? "";

        const learnedAnchors = learn.scoreRelevance(session, userQuery);

        const routing = this.router.decide({ session, messages });
        const effectiveStrategy = routing.strategy;

        // reliability-augmented provider list
        const providersWithReliability = agents.map((a) => {
            const snap = this.tracker.snapshot(a.id);
            return {
                ...a,
                reliability: snap.reliability,
            };
        });

        // orchestrator scoring telemetry
        const providerScoresRecord: Record<string, number> = {};
        for (const p of providersWithReliability) {
            providerScoresRecord[p.provider] = p.reliability;
        }

        this.telemetry.record({
            session,
            provider: "orchestrator",
            stage: "scoring",
            scores: providerScoresRecord,
        });

        // pipeline_start telemetry (CCR placeholder)
        this.telemetry.record({
            session,
            provider: "orchestrator",
            stage: "pipeline_start",
            messageCount: messages.length,
        });

        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "dedupe",
            messageCount: this.deduped.length,
        });

        // AUTO STRATEGY
        if (effectiveStrategy === "auto") {
            const chosen = this.selector.select({
                session,
                messages,
                providers: providersWithReliability,
                hints: routing.hints,
            });

            if (!chosen) {
                throw new Error("Orchestrator: selected agent undefined.");
            }

            // orchestrator selection telemetry
            this.telemetry.record({
                session,
                stage: "selection",
                provider: chosen.provider,
            });

            try {
                const start = Date.now();
                const result = await this.callAgent(chosen, messages);
                const duration = Date.now() - start;

                if (duration > 2000) {
                    this.tracker.record({
                        providerId: chosen.id,
                        provider: chosen.provider,
                        model: chosen.model,
                        session,
                        kind: "slow",
                        timestamp: Date.now(),
                    });
                }

                if (!result.content || result.content.trim() === "") {
                    this.tracker.record({
                        providerId: chosen.id,
                        provider: chosen.provider,
                        model: chosen.model,
                        session,
                        kind: "empty",
                        timestamp: Date.now(),
                    });
                }

                // pipeline_end telemetry (CCR placeholder)
                this.telemetry.record({
                    session,
                    provider: "orchestrator",
                    stage: "pipeline_end",
                    resultSize: result.content.length,
                });

                return result;
            } catch (err) {
                this.tracker.record({
                    providerId: chosen.id,
                    provider: chosen.provider,
                    model: chosen.model,
                    session,
                    kind: "error",
                    timestamp: Date.now(),
                });

                const fb = this.fallback.handle(
                    {
                        session,
                        messages,
                        provider: chosen,
                        attempt: 1,
                        error: err,
                    },
                    providersWithReliability,
                );

                if (fb.retry) {
                    this.tracker.record({
                        providerId: chosen.id,
                        provider: chosen.provider,
                        model: chosen.model,
                        session,
                        kind: "fallback",
                        timestamp: Date.now(),
                    });

                    return await this.callAgent(fb.provider, messages);
                }

                throw err;
            }
        }

        // SINGLE
        if (effectiveStrategy === "single") {
            const primary = agents[0];
            if (!primary) throw new Error("Orchestrator: no agent configured.");

            this.telemetry.record({
                session,
                stage: "selection",
                provider: primary.provider,
            });

            return this.callAgent(primary, messages);
        }

        // ROUND ROBIN
        if (effectiveStrategy === "round_robin") {
            return this.multi.roundRobin(session, messages);
        }

        // FAN OUT
        if (effectiveStrategy === "fan_out") {
            const results = await this.multi.fanOut(session, messages);

            if (results.length === 0) {
                throw new Error("Fan-out returned no results.");
            }

            const blended = this.blender.blend({ results });

            return {
                agentId: blended.sources[0]?.agentId ?? "unknown",
                role: "assistant",
                content: blended.content,
            };
        }

        throw new Error(`Unknown Strategy: ${effectiveStrategy}`);
    }

    private async callAgent(
        agent: OrchestratorConfig["agents"][0],
        messages: SMAGEMessage[],
    ): Promise<OrchestratorResult> {
        const session = this.config.session;

        // agent dispatch telemetry
        safeTelemetry(() =>
            this.telemetry.record({
                session,
                stage: "agent_dispatch",
                provider: agent.provider,
                agentId: agent.id,
            }),
        );

        const chain = new ProviderChainRouter(
            {
                metrics: {
                    openai: {
                        speed: agent.speed,
                        cost: agent.cost,
                        depth: agent.depth,
                        quality: agent.quality,
                        reliability:
                            this.tracker.snapshot("openai").reliability,
                    },
                    anthropic: {
                        speed: agent.speed,
                        cost: agent.cost,
                        depth: agent.depth,
                        quality: agent.quality,
                        reliability:
                            this.tracker.snapshot("anthropic").reliability,
                    },
                    google: {
                        speed: agent.speed,
                        cost: agent.cost,
                        depth: agent.depth,
                        quality: agent.quality,
                        reliability:
                            this.tracker.snapshot("google").reliability,
                    },
                    local: {
                        speed: agent.speed,
                        cost: agent.cost,
                        depth: agent.depth,
                        quality: agent.quality,
                        reliability: this.tracker.snapshot("local").reliability,
                    },
                },
                weights: {
                    speed: 0.1,
                    cost: 0.1,
                    depth: 0.3,
                    quality: 0.3,
                    reliability: 0.2,
                },
            },
            session,
        );

        const ccr = new CCRPipeline(this.telemetry);

        // CCR pipeline with orchestroator-level timeout guard
        const shaped = await timeoutGuard(
            ccr.run(session, messages, agent.options ?? {}),
            CCR_TIMEOUT_MS,
            `orchestrator-ccr-${agent.id}`,
        );

        // chain call with orchestrator-level timeout
        const res = await timeoutGuard(
            chain.call({
                session,
                model: agent.model,
                provider: agent.provider ?? "openai",
                messages: shaped.reconstructed,
                options: agent.options ?? {},
            }),
            ORCHESTRATOR_TIMEOUT_MS,
            `orchestrator-chain-${agent.id}`,
        );
        // agent result telemetry
        safeTelemetry(() =>
            this.telemetry.record({
                session,
                stage: "agent_result",
                provider: agent.provider,
                agentId: agent.id,
                response: res,
            }),
        );

        return {
            agentId: agent.id,
            role: res.role,
            content: res.content,
        };
    }
    async debugCCR(prompt: string) {
        const telemetry = new ProviderChainTelemetry();
        const pipeline = new CCRPipeline(telemetry);

        const messages: SMAGEMessage[] = [
            { role: "user", content: prompt, meta: {} },
        ];

        const shaped = await pipeline.run("debug-session", messages, {});

        return shaped; // contains metrics + timeline + shaped messages
    }
}
