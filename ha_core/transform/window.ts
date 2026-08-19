import type { SMAGEMessage } from "../index.js";
import { tokenCount } from "../analyze/tokens.js";
import { assignPriorities } from "./priority.js";
import { extractAnchor, mergeAnchor } from "./anchor.js";

/**
 * Internal view used for windowing:
 * - pulls priority + score out of meta (if present)
 * - computes token count
 */
interface ScoredMessage {
    message: SMAGEMessage;
    tokens: number;
    priority: number;
    score: number;
}

/**
 * CCR Context Window (MVP)
 *
 * Rules:
 * - Always preserve order
 * - Sort by priority DESC, then relevance DESC
 * - Fill the token budget until maxTokens
 * - Deterministic
 */
export function applyContextWindow(
    messages: SMAGEMessage[],
    maxTokens: number,
): SMAGEMessage[] {
    // 1. assign unified structural priority
    const prioritized = assignPriorities(messages, null);

    // 2. project into scored view
    const scored: ScoredMessage[] = prioritized.map((m) => ({
        message: m,
        tokens: tokenCount(m.content),
        priority: m.meta?.priority ?? 50,
        score: m.meta?.score ?? 0,
    }));

    // 3. sort by priority DESC, then score DESC
    const sorted = scored.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.score - a.score;
    });

    // 4. fill token budget
    const windowMessages: SMAGEMessage[] = [];
    let used = 0;

    for (const item of sorted) {
        if (used + item.tokens > maxTokens) continue;
        used += item.tokens;
        windowMessages.push(item.message);
    }

    // 5. restore chronological order
    const ordered = messages.filter((m) => windowMessages.includes(m));

    // 6. inject anchor spine
    const anchor = extractAnchor(messages);
    return mergeAnchor(anchor, ordered);
}
