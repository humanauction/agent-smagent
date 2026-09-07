import type { SMAGEMessage } from "../ha_core/index.js";
import { learn } from "../ha_learn/index.js";
import { CCRRouter } from "./ccrRouting.js";

export interface RoutingContext {
    session: string;
    messages: SMAGEMessage[];
    providerMetadata?: {
        provider: string;
        depth: number;
        cost: number;
        quality: number;
        reliability: number;
    };
}

export interface RoutingDecision {
    strategy: "single" | "round_robin" | "fan_out" | "auto";
    hints: {
        preferDeep?: boolean;
        preferFast?: boolean;
        preferCheap?: boolean;
        preferHighQuality?: boolean;
    };
    window: SMAGEMessage[];
}

export class MemoryRouter {
    private ccr = new CCRRouter();

    decide(ctx: RoutingContext): RoutingDecision {
        const { session, messages, providerMetadata } = ctx;

        // --- CCR hints ---
        const ccrHints = this.ccr.decide(ctx);
        const hints: RoutingDecision["hints"] = { ...ccrHints };

        // --- Provider metadata ---
        const provider = providerMetadata?.provider ?? null;
        const depth = Number(providerMetadata?.depth ?? 0);
        const cost = Number(providerMetadata?.cost ?? 0);
        const quality = Number(providerMetadata?.quality ?? 0);
        const reliability = Number(providerMetadata?.reliability ?? 0);

        // --- Last user query ---
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const userQuery = lastUser?.content ?? "";

        // --- Learned relevance ---
        const scored = learn.scoreRelevance(session, userQuery);
        const top = scored[0];

        if (top) {
            const text = top.text.toLowerCase();
            if (text.includes("deep") || text.includes("analysis"))
                hints.preferDeep = true;
            if (text.includes("fast") || text.includes("quick"))
                hints.preferFast = true;
            if (text.includes("cheap") || text.includes("cost"))
                hints.preferCheap = true;
            if (text.includes("quality") || text.includes("best"))
                hints.preferHighQuality = true;
        }

        // --- Provider-specific memory shaping ---
        let memoryLimit = 10;

        if (depth > 0.6) memoryLimit += 10;
        if (quality > 0.7) memoryLimit += 5;
        if (cost > 0.7) memoryLimit -= 5;
        if (reliability > 0.7) memoryLimit += 5;
        if (provider === "local") memoryLimit = 3;

        memoryLimit = Math.max(1, Math.min(memoryLimit, 40));

        const window = messages.slice(-memoryLimit);

        // --- Strategy selection ---
        if (hints.preferDeep) return { strategy: "fan_out", hints, window };
        if (hints.preferFast) return { strategy: "single", hints, window };
        if (hints.preferCheap)
            return { strategy: "round_robin", hints, window };
        if (hints.preferHighQuality)
            return { strategy: "fan_out", hints, window };

        return { strategy: "auto", hints, window };
    }
}
