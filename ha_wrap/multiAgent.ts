import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { applyCCR } from "../ha_core/transform/ccr.js";
import { SMAGEAgent } from "./agent.js";
import { CCRPipeline } from "../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../ha_core/call/providers/chainTelemetry.js";

export interface AgentDescriptor {
    depth?: number; // optional depth score (0-1)
    id: string;
    provider: string;
    model: string;
    options?: (SMAGEOptions & Record<string, unknown>) | undefined;
    quality?: number; // optional quality score (0-1)
    reliability?: number; // injected by orchestrator
}

export interface OrchestratedResult {
    agentId: string;
    content: string;
    reliability?: number; // optional reliability score
    role: string;
    weight: number; // optional weight score
}

export class SMAGEMultiAgent {
    private agents: AgentDescriptor[];
    private core: SMAGEAgent;
    private rrIndex = 0;
    private computeIntentWeight(
        intent: string | undefined,
        agent: AgentDescriptor,
    ): number {
        if (!intent) return 1;

        const depth = Number(agent.options?.depth ?? agent.depth ?? 0);
        const quality = Number(agent.options?.quality ?? agent.quality ?? 0);
        const reliability = Number(agent.reliability ?? 0);

        switch (intent.toLowerCase()) {
            case "debug":
                return 1 + depth * 0.6 + quality * 0.4 + reliability * 0.4;

            case "explain":
                return 1 + quality * 0.6 + reliability * 0.3;

            case "refactor":
                return 1 + depth * 0.7;

            case "testing":
                return 1 + quality * 0.5 + reliability * 0.3;

            case "design":
                return 1 + depth * 0.7 + quality * 0.5;

            default:
                return 1;
        }
    }

    constructor(agents: AgentDescriptor[]) {
        if (agents.length === 0) {
            throw new Error("SMAGEMultiAgent requires at least one agent.");
        }

        this.agents = agents;
        this.core = new SMAGEAgent();
    }

    async fanOut(
        session: string,
        messages: SMAGEMessage[],
        intent: string | null = null,
    ): Promise<OrchestratedResult[]> {
        const calls = this.agents.map(async (agent) => {
            const res = await this.core.call({
                session,
                model: agent.model,
                provider: agent.provider,
                messages,
                options: agent.options ?? {},
            });

            const weight = this.computeIntentWeight(intent ?? undefined, agent);

            return {
                agentId: agent.id,
                role: res.role,
                content: res.content,
                reliability: agent.reliability ?? 0,
                weight,
            };
        });

        return Promise.all(calls);
    }

    async firstSatisfying(
        session: string,
        messages: SMAGEMessage[],
        predicate: (result: OrchestratedResult) => boolean,
    ): Promise<OrchestratedResult | null> {
        for (const agent of this.agents) {
            const res = await this.core.call({
                session,
                model: agent.model,
                provider: agent.provider,
                messages,
                options: agent.options ?? {},
            });

            const wrapped: OrchestratedResult = {
                agentId: agent.id,
                role: res.role,
                content: res.content,
                reliability: agent.reliability ?? 0,
                weight: this.computeIntentWeight(undefined, agent), // no intent provided here
            };

            if (predicate(wrapped)) {
                return wrapped;
            }
        }
        return null;
    }

    async roundRobin(
        session: string,
        messages: SMAGEMessage[],
    ): Promise<OrchestratedResult> {
        const idx = this.rrIndex % this.agents.length;
        const agent = this.agents[idx];

        if (!agent) {
            throw new Error(
                `No agent found for round-robin call. index failure ${idx}`,
            );
        }

        this.rrIndex++;

        const res = await this.core.call({
            session,
            model: agent.model,
            provider: agent.provider,
            messages,
            options: agent.options ?? {},
        });

        return {
            agentId: agent.id,
            role: res.role,
            content: res.content,
            reliability: agent.reliability ?? 0,
            weight: this.computeIntentWeight(undefined, agent), // no intent provided here
        };
    }
    getAnchors() {
        return {
            system: "SMAGE Multi-Agent System Anchor",
            lastUser: null,
            lastAssistant: null,
            lastTool: null,
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
