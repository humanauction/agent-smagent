import type { SMAGEMessage } from "../ha_core/index.js";
import { extractAnchor } from "../ha_core/transform/anchor.js";
import { scoreMessage } from "../ha_core/transform/relevance.js";
import { assignPriority } from "../ha_core/transform/priority.js";

// this file defines the CCRRouter class, responsible for message routing decisions based on context and relevance.
export interface CCRRoutingContext {
    session: string;
    messages: SMAGEMessage[];
}

export interface CCRRoutingHints {
    preferDeep?: boolean;
    preferFast?: boolean;
    preferCheap?: boolean;
    preferHighQuality?: boolean;
    preferMultiAgent?: boolean;
    preferSingleAgent?: boolean;
    preferFanOut?: boolean;
    preferRoundRobin?: boolean;
}

export class CCRRouter {
    decide(ctx: CCRRoutingContext): CCRRoutingHints {
        const { messages } = ctx;

        const hints: CCRRoutingHints = {};

        // 1. Anchors
        const anchor = extractAnchor(messages);
        const topAnchor =
            anchor.lastUser ?? anchor.lastAssistant ?? anchor.system.at(0);

        if (topAnchor) {
            const text = topAnchor.content.toLowerCase();

            if (text.includes("deep") || text.includes("analysis")) {
                hints.preferDeep = true;
                hints.preferFanOut = true;
            }

            if (text.includes("quick") || text.includes("fast")) {
                hints.preferFast = true;
                hints.preferSingleAgent = true;
            }

            if (text.includes("cheap") || text.includes("cost")) {
                hints.preferCheap = true;
            }

            if (text.includes("quality") || text.includes("best")) {
                hints.preferHighQuality = true;
            }
        }

        // 2. Relevance
        let highRelevanceCount = 0;

        for (const m of messages) {
            const score = scoreMessage(m);
            if (score > 0.8) highRelevanceCount++;
        }

        if (highRelevanceCount > 3) {
            hints.preferDeep = true;
            hints.preferFanOut = true;
        }

        // 3. Priority (numeric)
        let urgentCount = 0;

        for (const m of messages) {
            const priority = assignPriority(m); // e.g. 0–3
            if (priority >= 2) urgentCount++;
        }

        if (urgentCount > 0) {
            hints.preferFast = true;
            hints.preferSingleAgent = true;
        }

        // 4. Approximate context pressure by message count
        if (messages.length > 20) {
            hints.preferDeep = true;
            hints.preferFanOut = true;
            hints.preferMultiAgent = true;
        }

        // 5. Memory injection (if you use meta.memory)
        const memoryInjected = messages.some(
            (m) => m.meta && m.meta.memory === true,
        );

        if (memoryInjected) {
            hints.preferHighQuality = true;
            hints.preferDeep = true;
        }

        return hints;
    }
}
