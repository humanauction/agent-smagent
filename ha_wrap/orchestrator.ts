import type { SMAGEMessage } from "../ha_core/index.js";
import { SMAGEAgent } from "./agent.js";
import { SMAGEMultiAgent } from "./multi_agent.js";
import { learn } from "../ha_learn/index.js";
import { ProviderSelector } from "./providerSelection.js";
import { ProviderFallback } from "./providerFallback.js";
import { ResponseBlender } from "./responseBlender.js";
import { MemoryRouter } from "./memoryRouting.js";
import { ProviderReliabilityTracker } from "./providerReliability.js";

export interface OrchestratorConfig {
    session: string;
    strategy: "single" | "round_robin" | "fan_out" | "auto";
    agents: {
        id: string;
        provider: string;
        model: string;
        options?: Record<string, unknown> | undefined;
    }[];
}

export interface OrchestratorResult {
    agentId: string;
    role: string;
    content: string;
}

export class SMAGEOrchestrator {
    private config: OrchestratorConfig;
    private single: SMAGEAgent;
    private multi: SMAGEMultiAgent;
    private selector = new ProviderSelector();
    private fallback = new ProviderFallback();
    private blender = new ResponseBlender();
    private router = new MemoryRouter();
    private tracker = new ProviderReliabilityTracker();

    constructor(config: OrchestratorConfig) {
        if (config.agents.length === 0) {
            throw new Error("Orchestrator requires at least one agent.");
        }

        this.config = config;
        this.single = new SMAGEAgent();
        this.multi = new SMAGEMultiAgent(config.agents);
    }

    async orchestrate(messages: SMAGEMessage[]): Promise<OrchestratorResult> {
        const { session, strategy, agents } = this.config;

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const userQuery = lastUser?.content ?? "";
        const learnedAnchors = learn.scoreRelevance(session, userQuery);
        const routing = this.router.decide({ session, messages });
        const effectiveStrategy = routing.strategy;

        // Build reliability-augmented provider list
        const providersWithReliability = agents.map((a) => {
            const snap = this.tracker.snapshot(a.id);
            return {
                ...a,
                reliability: snap.reliability,
            };
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
        const res = await this.single.call({
            session: this.config.session,
            model: agent.model,
            provider: agent.provider,
            messages,
            options: agent.options ?? {},
        });

        return {
            agentId: agent.id,
            role: res.role,
            content: res.content,
        };
    }
}
