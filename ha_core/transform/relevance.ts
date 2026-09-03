import type { SMAGEMessage } from "../index.js";
import { tokenCount } from "../analyze/tokens.js";
import type { CCRAnchor } from "./anchor.js";
import { semanticEmbedding } from "./semantic.js";

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

export async function scoreRelevance(
    msg: SMAGEMessage,
    index: number,
    total: number,
    anchor: CCRAnchor | null,
): Promise<number> {
    let structural = 0.1;

    structural += ROLE_WEIGHT[msg.role] ?? 0;

    const recency = (index + 1) / total;
    structural += recency * 0.3;

    if (anchor) {
        if (msg === anchor.lastUser) structural += 0.2;
        if (msg === anchor.lastAssistant) structural += 0.15;
        if (msg === anchor.lastTool) structural += 0.1;
        if (msg === anchor.system) structural += 0.05;
    }

    const lower = msg.content.toLowerCase();
    for (const [kw, boost] of KEYWORD_BOOSTS) {
        if (lower.includes(kw)) structural += boost;
    }

    if (msg.content.length < 10) structural -= 0.2;
    if (/^(ok|sure|thanks|cool)$/i.test(msg.content)) structural -= 0.3;

    const tokens = msg.content.split(/\s+/).length;
    structural += Math.min(tokens / 50, 0.3);

    // clamp before continuity
    structural = Math.max(0, Math.min(structural, 1));

    // --- Topic continuity boost ---
    if (anchor?.topic) {
        const topic = anchor.topic.toLowerCase();
        const lowerMsg = msg.content.toLowerCase();
        if (topic && lowerMsg.includes(topic)) {
            structural += 0.08;
            msg.meta = { ...msg.meta, topicMatch: true };
        }
    } else if (anchor?.summaryHint) {
        const hintWord = anchor.summaryHint.split(" ")[0]?.toLowerCase() ?? "";
        const lowerMsg = msg.content.toLowerCase();
        if (hintWord && lowerMsg.includes(hintWord)) {
            structural += 0.05;
            msg.meta = { ...msg.meta, topicMatch: false };
        }
    }

    // clamp again after continuity
    structural = Math.max(0, Math.min(structural, 1));

    // --- Stage‑3 semantic relevance (embeddings) ---
    const semantic = await semanticEmbedding(
        msg,
        anchor?.lastUser?.content ?? "",
    );

    const final = 0.7 * structural + 0.3 * semantic;
    return Math.max(0, Math.min(final, 1));
}
