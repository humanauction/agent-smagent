import type { SMAGEMessage } from "../index.js";
import { tokenCount } from "../analyze/tokens.js";
import type { CCRAnchor } from "./anchor.js";
// CCR pipeline relevance scoring. components: keyword overlap, role weighting, recency weighting

const ROLE_WEIGHT = {
    system: 0.2,
    user: 1.0,
    assistant: 0.4,
    tool: 0.8,
    summary: 0.6,
};

const KEYWORD_BOOSTS: [string, number][] = [
    ["urgent", 0.3],
    ["error", 0.25],
    ["fix", 0.25],
    ["analysis", 0.2],
    ["deep", 0.2],
    ["why", 0.15],
    ["how", 0.15],
    ["explain", 0.15],
];

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
    anchor: CCRAnchor | null,
): number {
    let score = 0.1;

    // Role weighting
    score += ROLE_WEIGHT[msg.role] ?? 0;

    // Recency weighting
    const recency = (index + 1) / total;
    score += recency * 0.3;

    // anchor proximity
    if (anchor) {
        if (msg === anchor.lastUser) score += 0.2;
        if (msg === anchor.lastAssistant) score += 0.15;
        if (msg === anchor.lastTool) score += 0.1;
        if (msg === anchor.system) score += 0.05;
    }

    // Explicit markers
    if (msg.content.includes("IMPORTANT")) score += 0.25;

    // keyword boost
    const lower = msg.content.toLowerCase();
    for (const [kw, boost] of KEYWORD_BOOSTS) {
        if (lower.includes(kw)) score += boost;
    }

    // low info content penalty
    if (msg.content.length < 10) score -= 0.2;
    if (/^(ok|sure|thanks|cool)$/i.test(msg.content)) score -= 0.3;

    // Semantic density
    const tokens = msg.content.split(/\s+/).length;
    score += Math.min(tokens / 50, 0.3);

    return Math.max(0, Math.min(score, 1));
}
