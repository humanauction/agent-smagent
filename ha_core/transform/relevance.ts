import type { SMAGEMessage } from "../index.js";
import { tokenCount } from "../analyze/tokens.js";
// CCR pipeline relevance scoring. components: keyword overlap, role weighting, recency weighting
/**
 * Extract keywords from a message.
 * Lowercase, remove punctuation, split on whitespace.
 */
function extractKeywords(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter(Boolean),
    );
}

/**
 * Compute relevance score between a message and the last user message.
 * - Keyword overlap
 * - Role weighting
 * - Recency weighting
 */
export function relevanceScore(
    msg: SMAGEMessage,
    lastUser: SMAGEMessage | undefined,
    index: number,
    total: number,
): number {
    if (!lastUser) return 0;

    const userKeywords = extractKeywords(lastUser.content);
    const msgKeywords = extractKeywords(msg.content);

    // Keyword overlap
    let overlap = 0;
    for (const kw of msgKeywords) {
        if (userKeywords.has(kw)) overlap++;
    }

    // Role weighting
    const roleWeight =
        msg.role === "assistant"
            ? 2
            : msg.role === "tool"
              ? 1.5
              : msg.role === "user"
                ? 3
                : 1;

    // Recency weighting
    const recency = (index + 1) / total; // 0..1

    return overlap * roleWeight * recency;
}

export function scoreMessage(msg: SMAGEMessage): number {
    let score = 0;

    if (msg.meta?.anchor) score += 100;
    if (msg.role === "user") score += 50;
    if (msg.role === "system") score += 40;
    if (msg.role === "assistant") score += 20;

    score += Math.min(tokenCount(msg.content), 200) / 10;

    return score;
}
