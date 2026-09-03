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
    anchor: CCRAnchor | null,
): SMAGEMessage[] {
    const intent = anchor?.intent ?? null;

    return messages.map((m) => {
        const r = m.meta?.relevance ?? 0;

        // --- Structural priority (Stage‑1 CCR) ---
        let priority = 0;

        // Tier 3 — must‑keep
        if (m.meta?.anchor) {
            priority = 3;
        } else if (
            anchor?.lastUser === m ||
            anchor?.lastAssistant === m ||
            anchor?.lastTool === m
        ) {
            priority = 3;
        } else if (r >= 0.65) {
            priority = 3;
        }

        // Tier 2 — medium
        else if (r >= 0.35) {
            priority = 2;
        }

        // Tier 1 — low
        else if (r >= 0.15) {
            priority = 1;
        }

        // Tier 0 — discardable (priority stays 0)
        else {
            priority = 0;
        }

        // --- Intent‑aware routing (Stage‑2 CCR) ---
        let tier = priority;

        if (intent === "debug" && m.role === "tool") {
            tier = Math.max(tier, 3); // keep tool outputs
        }

        if (
            intent === "testing" &&
            /test|jest|vitest/.test(m.content.toLowerCase())
        ) {
            tier = Math.max(tier, 3); // keep test-related messages
        }

        if (intent === "explain" && m.role === "assistant") {
            tier = Math.max(tier, 2); // assistant explanations get medium+
        }

        return {
            ...m,
            meta: { ...m.meta, tier, priority },
        };
    });
}
