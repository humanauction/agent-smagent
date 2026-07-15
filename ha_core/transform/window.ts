import type { SMAGEMessage } from "../index.js";
import { assignPriority } from "./priority.js";
import { tokenCount } from "../analyze/tokens.js";

// this function applies a context window to the messages, keeping the most relevant messages within the max token limit.
/**
 * Responsibilities
 * // enforce token budget
 * // evict low‑priority messages
 * // preserve anchors
 * // preserve high‑relevance messages
 */

export function applyContextWindow(
    messages: SMAGEMessage[],
    maxTokens: number,
) {
    const sorted = messages.sort((a, b) => {
        return assignPriority(a) - assignPriority(b);
    });

    const out = [];
    let total = 0;

    for (const msg of sorted) {
        const t = tokenCount(msg.content);
        if (total + t > maxTokens && !msg.meta?.anchor) continue;
        out.push(msg);
        total += t;
    }

    return out;
}
