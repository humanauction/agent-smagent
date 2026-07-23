import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { SMAGEAgent } from "./agent.js";

// this file contains the implementation of the multi-agent orchestration logic for the SMAGE framework
export interface AgentDescriptor {
    id: string;
    provider: string;
    model: string;
    options?: (SMAGEOptions & Record<string, unknown>) | undefined;
}

export interface OrchestratedResult {
    agentId: string;
    role: string;
    content: string;
}

export class SMAGEMultiAgent {
    private agents: AgentDescriptor[];
    private core: SMAGEAgent;
    private rrIndex = 0;

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
    ): Promise<OrchestratedResult[]> {
        const calls = this.agents.map(async (agent) => {
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
        };
    }
}
