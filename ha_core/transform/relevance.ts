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

/**
 * CCR Relevance Scoring (MVP)
 *
 * Goals:
 * - deterministic
 * - cheap
 * - role-aware
 * - stable across compression
 * - safe for window shaping
 *
 * Scoring rules:
 * - system messages: highest relevance
 * - last user intent: very high relevance
 * - last assistant reply: high relevance
 * - tool messages: medium relevance
 * - older messages: decreasing relevance
 *
 * No NLP, no embeddings, no classifiers.
 * Pure structural relevance.
 */

export function scoreMessage(msg: SMAGEMessage): number {
    // System messages always matter
    if (msg.role === "system") return 100;

    // User messages matter more than assistant/tool
    if (msg.role === "user") return 90;

    // Assistant messages matter for continuity
    if (msg.role === "assistant") return 80;

    // Tool messages matter but less
    if (msg.role === "tool") return 70;

    // Unknown roles (should not happen)
    return 50;
}

/**
 * Score list of messages deterministically.
 */
export function scoreMessages(messages: SMAGEMessage[]): SMAGEMessage[] {
    return messages.map((m) => ({
        ...m,
        meta: { ...m.meta, score: scoreMessage(m) },
    }));
}

export function scoreRelevance(
    msg: SMAGEMessage,
    index: number,
    total: number,
): number {
    let score = 0;

    // Role weighting
    if (msg.role === "system") score += 50;
    else if (msg.role === "user") score += 40;
    else if (msg.role === "assistant") score += 30;
    else score += 10;

    // Recency weighting
    const recency = (index + 1) / total;
    score += recency * 20;

    // Explicit markers
    if (msg.content.includes("IMPORTANT")) score += 25;

    // Token density
    const MAX_TOKENS: number = 50;
    const tokens = Math.min(tokenCount(msg.content) ?? 0, MAX_TOKENS);

    score += tokens / 5;

    return score;
}
