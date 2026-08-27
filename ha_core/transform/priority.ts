import type { SMAGEMessage } from "../index.js";
import type { CCRAnchor } from "./anchor.js";

/*
 * CCR Priority Tiers
 */

export function assignPriority(
    messages: SMAGEMessage[],
    anchor: CCRAnchor,
): SMAGEMessage[] {
    return messages.map((m) => {
        const r = m.meta?.relevance ?? 0;

        let priority = 0;

        // Anchor messages always highest priority
        if (m.meta?.anchor) {
            priority = 3;
        }
        // Last user / last assistant / last tool
        else if (
            anchor.lastUser === m ||
            anchor.lastAssistant === m ||
            anchor.lastTool === m
        ) {
            priority = 3;
        }
        // High relevance
        else if (r >= 0.75) {
            priority = 3;
        }
        // Medium relevance
        else if (r >= 0.4) {
            priority = 2;
        }
        // Low relevance
        else if (r >= 0.15) {
            priority = 1;
        }
        // Otherwise discardable (priority 0)

        return {
            ...m,
            meta: { ...m.meta, priority },
        };
    });
}
