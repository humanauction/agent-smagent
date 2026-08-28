import type { SMAGEMessage } from "../index.js";
import { tokenCount } from "../analyze/tokens.ts";

// this file contains the context windowing logic for SMAGE messages.
// selects a subset of messages based on priority, relevance, recency.
// respects maximum token limit.

/**
 * CCR Window Shaping (Stage 1)
 *
 * Deterministic, priority‑tiered, relevance‑aware, token‑bounded window.
 *
 * Invariants:
 * - Anchors are always preserved.
 * - Priority tiers enforced.
 * - Relevance used for trimming.
 * - Output is ≤ maxTokens.
 * - Original chronological order preserved.
 */

export interface WindowResult {
    windowed: SMAGEMessage[];
    dropped: SMAGEMessage[];
    tokens: number;
}

export function applyContextWindow(
    messages: SMAGEMessage[],
    maxTokens: number,
): WindowResult {
    // --- 1. Partition messages into tiers ---
    const anchors: SMAGEMessage[] = [];
    const high: SMAGEMessage[] = [];
    const medium: SMAGEMessage[] = [];
    const low: SMAGEMessage[] = [];

    for (const m of messages) {
        const meta = m.meta ?? {};

        if (meta.anchor || meta.learned) {
            anchors.push(m);
            continue;
        }

        const p = meta.priority ?? 0;
        const r = meta.relevance ?? 0;

        if (p >= 3 || r >= 0.75) high.push(m);
        else if (p === 2 || r >= 0.4) medium.push(m);
        else low.push(m);
    }

    // --- 2. Sort each tier deterministically ---
    const sortTier = (tier: SMAGEMessage[]) =>
        tier.sort((a, b) => {
            const pa = a.meta?.priority ?? 0;
            const pb = b.meta?.priority ?? 0;
            if (pa !== pb) return pb - pa;

            const ra = a.meta?.relevance ?? 0;
            const rb = b.meta?.relevance ?? 0;
            if (ra !== rb) return rb - ra;

            return 0; // stable
        });

    sortTier(high);
    sortTier(medium);
    sortTier(low);

    // --- 3. Build window (anchors first) ---
    const window: SMAGEMessage[] = [];
    let used = 0;

    const tryAdd = (msg: SMAGEMessage) => {
        const t = tokenCount(msg.content);
        if (used + t > maxTokens) return false;
        used += t;
        window.push(msg);
        return true;
    };

    // Anchors ALWAYS included
    for (const a of anchors) tryAdd(a);

    // High tier (up to ~70% budget)
    for (const h of high) {
        if (used > maxTokens * 0.7) break;
        tryAdd(h);
    }

    // Medium tier (up to ~90% budget)
    for (const m of medium) {
        if (used > maxTokens * 0.9) break;
        tryAdd(m);
    }

    // Low tier (opportunistic)
    for (const l of low) tryAdd(l);

    // --- 4. Hard trim if over budget (never trim anchors) ---
    const overBudget = used > maxTokens;
    if (overBudget) {
        const nonAnchors = window.filter((m) => !m.meta?.anchor);
        const anchorsOnly = window.filter((m) => m.meta?.anchor);

        // Trim lowest relevance first, then oldest
        const sortedTrim = [...nonAnchors].sort((a, b) => {
            const ra = a.meta?.relevance ?? 0;
            const rb = b.meta?.relevance ?? 0;
            if (ra !== rb) return ra - rb;
            return messages.indexOf(a) - messages.indexOf(b);
        });

        for (const msg of sortedTrim) {
            if (used <= maxTokens) break;
            const t = tokenCount(msg.content);
            used -= t;
            window.splice(window.indexOf(msg), 1);
        }

        // Re‑add anchors
        for (const a of anchorsOnly) {
            if (!window.includes(a)) window.push(a);
        }
    }

    // --- 5. Restore chronological order ---
    window.sort((a, b) => messages.indexOf(a) - messages.indexOf(b));

    // --- 6. Compute dropped messages ---
    const windowSet = new Set(window);
    const dropped = messages.filter((m) => !windowSet.has(m));

    return {
        windowed: window,
        dropped,
        tokens: used,
    };
}
