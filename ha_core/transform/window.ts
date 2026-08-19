import type { SMAGEMessage } from "../index.js";

// this file contains the context windowing logic for SMAGE messages.
// selects a subset of messages based on priority, relevance, recency.
// respects maximum token limit.

export function applyContextWindow(
    messages: SMAGEMessage[],
    maxTokens: number,
): SMAGEMessage[] {
    // 1. Sort by priority (desc), then relevance (desc), then recency (desc)
    const sorted = [...messages].sort((a, b) => {
        const pa = a.meta?.priority ?? 0;
        const pb = b.meta?.priority ?? 0;

        if (pa !== pb) return pb - pa;

        const ra = a.meta?.relevance ?? 0;
        const rb = b.meta?.relevance ?? 0;

        if (ra !== rb) return rb - ra;

        return 0; // preserve original order for equal scores
    });

    // 2. Select messages until token limit reached
    const out: SMAGEMessage[] = [];
    let tokens = 0;

    for (const msg of sorted) {
        const t = msg.content.split(/\s+/).length;

        if (tokens + t > maxTokens) continue;

        tokens += t;
        out.push(msg);
    }

    // 3. Restore original chronological order
    out.sort((a, b) => messages.indexOf(a) - messages.indexOf(b));

    return out;
}
