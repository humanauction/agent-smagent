import type { SMAGEMessage } from "../index.js";
import type { CCRAnchor } from "./anchor.js";

/**
 * Stage‑1 CCR Priority Assignment
 *
 * Priority tiers:
 *  - 3: anchor spine + high relevance
 *  - 2: medium relevance
 *  - 1: low relevance
 *  - 0: discardable
 *
 * Priority is structural, not semantic.
 * It determines which messages survive window shaping.
 */

export function assignPriority(
    messages: SMAGEMessage[],
    anchor: CCRAnchor,
): SMAGEMessage[] {
    return messages.map((m) => {
        const r = m.meta?.relevance ?? 0;
        let priority = 0;

        // Tier 3 — highest priority (always keep)
        if (m.meta?.anchor) {
            priority = 3;
        } else if (
            anchor.lastUser === m ||
            anchor.lastAssistant === m ||
            anchor.lastTool === m
        ) {
            priority = 3;
        } else if (r >= 0.65) {
            priority = 3;
        }

        // Tier 2 — medium priority
        else if (r >= 0.35) {
            priority = 2;
        }

        // Tier 1 — low priority
        else if (r >= 0.15) {
            priority = 1;
        }

        // Tier 0 — discardable (priority stays 0)

        return {
            ...m,
            meta: { ...m.meta, priority },
        };
    });
}
