import type { SMAGEMessage } from "../ha_core/index.js";
import { learn } from "../ha_learn/index.js";

// this file defines the MemoryRouter class, responsible for message routing decisions based on learned relevance and context.
export interface RoutingContext {
    session: string;
    messages: SMAGEMessage[];
}

export interface RoutingDecision {
    strategy: "single" | "round_robin" | "fan_out" | "auto";
    hints: {
        preferDeep?: boolean;
        preferFast?: boolean;
        preferCheap?: boolean;
        preferHighQuality?: boolean;
    };
}

export class MemoryRouter {
    decide(ctx: RoutingContext): RoutingDecision {
        const { session, messages } = ctx;

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const userQuery = lastUser?.content ?? "";

        const scored = learn.scoreRelevance(session, userQuery);
        const top = scored[0];

        const hints: RoutingDecision["hints"] = {};

        if (top) {
            const text = top.text.toLowerCase();

            if (text.includes("deep") || text.includes("analysis")) {
                hints.preferDeep = true;
            }
            if (text.includes("fast") || text.includes("quick")) {
                hints.preferFast = true;
            }
            if (text.includes("cheap") || text.includes("cost")) {
                hints.preferCheap = true;
            }
            if (text.includes("quality") || text.includes("best")) {
                hints.preferHighQuality = true;
            }
        }

        // Simple strategy selection based on hints
        if (hints.preferDeep) {
            return { strategy: "fan_out", hints };
        }

        if (hints.preferFast) {
            return { strategy: "single", hints };
        }

        // Default: auto (let provider selector + orchestrator decide)
        return { strategy: "auto", hints };
    }
}
