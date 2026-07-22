import type { SMAGEMessage } from "../ha_core/index.js";
import { SMAGEAgent } from "./agent.js";
import { SMAGEMultiAgent } from "./multi_agent.js";
import { learn } from "../ha_learn/index.js";

/*
this file defines the orchestrator class, responsible for orchestrating multiple agents based on a given strategy.
currently can call: single agent; fan out to multiple agents; employ round-robin approach to distribute messages among agents.
Orchestrator also has an "auto" strategy that selects agent based on learned relevance from previous interactions.
*/
export interface OrchestratorConfig {
    session: string;
    strategy: "single" | "round_robin" | "fan_out" | "auto";
    agents: {
        id: string;
        provider: string;
        model: string;
        options?: Record<string, any>;
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

        // AUTO STRATEGY
        if (strategy === "auto") {
            const primary = agents[0];
            const secondary = agents[1] ?? agents[0];

            if (!primary) {
                throw new Error("Orchestrator: no primary agent configured.");
            }

            const top = learnedAnchors[0];
            const chosen =
                top && top.text.includes("deep") ? secondary : primary;

            if (!chosen) {
                throw new Error("Orchestrator: selected agent undefined.");
            }

            return this.callAgent(chosen, messages);
        }

        // SINGLE
        if (strategy === "single") {
            const primary = agents[0];
            if (!primary) throw new Error("Orchestrator: no agent configured.");
            return this.callAgent(primary, messages);
        }

        // ROUND ROBIN
        if (strategy === "round_robin") {
            return this.multi.roundRobin(session, messages);
        }

        // FAN OUT
        if (strategy === "fan_out") {
            const results = await this.multi.fanOut(session, messages);
            const first = results[0];
            if (!first) {
                throw new Error("Fan-out returned no results.");
            }
            return first;
        }

        throw new Error(`Unknown strategy: ${strategy}`);
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
