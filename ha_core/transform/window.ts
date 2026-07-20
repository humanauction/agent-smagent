import type { SMAGEMessage } from "../index.js";
import { tokenCount } from "../analyze/tokens.js";

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
    // 1. Project messages into a scored view
    const scored: ScoredMessage[] = messages.map((m) => ({
        message: m,
        tokens: tokenCount(m.content),
        priority: (m.meta as any)?.priority ?? 0,
        score: (m.meta as any)?.score ?? 0,
    }));

    // 2. Sort by priority DESC, then score DESC
    const sorted = [...scored].sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.score - a.score;
    });

    // 3. Fill window until token budget
    const windowMessages: SMAGEMessage[] = [];
    let used = 0;

    for (const item of sorted) {
        if (used + item.tokens > maxTokens) continue;
        used += item.tokens;
        windowMessages.push(item.message);
    }

    // 4. Restore original chronological order
    const ordered = messages.filter((m) => windowMessages.includes(m));

    return ordered;
}
