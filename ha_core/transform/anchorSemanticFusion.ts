import type { SMAGEMessage } from "../index.js";

/*
 * this file implements a semantic fusion step for CCR anchors.
 * Groups anchors by normalized content, fuses them into single anchor message,
 * preserves the most relevant one based on meta field 'relevance' score.
 * fused anchor retains the original role, name, meta information
 * additional flags indicate applied semantic fusion.
 */

export function semanticAnchorFusion(messages: SMAGEMessage[]): SMAGEMessage[] {
    const anchors = messages.filter((m) => m.meta?.anchor === true);

    if (anchors.length <= 1) return messages;

    const groups = new Map<string, SMAGEMessage[]>();

    for (const a of anchors) {
        const raw = typeof a.content === "string" ? a.content : "";
        const key = raw.toLowerCase().replace(/\s+/g, " ").trim();

        if (!key) continue;

        const existing = groups.get(key) ?? [];
        existing.push(a);
        groups.set(key, existing);
    }

    const fusedAnchors: SMAGEMessage[] = [];

    for (const [, group] of groups) {
        if (group.length === 0) continue;

        const first = group[0];
        if (!first) continue; // strict‑safe guard

        let base: SMAGEMessage = first;
        let bestScore = Number(base.meta?.relevance ?? 0);

        for (const g of group) {
            const score = Number(g.meta?.relevance ?? 0);
            if (score > bestScore) {
                bestScore = score;
                base = g;
            }
        }

        const raw = typeof base.content === "string" ? base.content : "";
        const trimmed = raw.replace(/\s+/g, " ").trim();

        const fused: SMAGEMessage = {
            role: base.role,
            content: trimmed,
            name: base.name,
            meta: {
                ...(base.meta ?? {}),
                anchor: true,
                fusedSemantic: true,
                fusedCount: group.length,
            },
        };

        fusedAnchors.push(fused);
    }

    const nonAnchors = messages.filter((m) => !m.meta?.anchor);

    return [...nonAnchors, ...fusedAnchors];
}
