import type { OrchestratedResult } from "./multiAgent.js";

export interface BlendInput {
    results: OrchestratedResult[];
}

export interface BlendOutput {
    content: string;
    sources: {
        agentId: string;
        weight: number;
    }[];
}

export class ResponseBlender {
    blend(input: BlendInput): BlendOutput {
        const { results } = input;

        // --- Case: no results ---
        if (results.length === 0) {
            return {
                content: "[no response]",
                sources: [],
            };
        }

        // --- Case: single result ---
        if (results.length === 1) {
            const single = results.at(0);
            if (!single) {
                return {
                    content: "[no response]",
                    sources: [],
                };
            }
            return {
                content: single.content,
                sources: [{ agentId: single.agentId, weight: 1 }],
            };
        }

        // --- Case: multiple results ---
        // Step 1: score each result
        const scored = results.map((r) => {
            const reliability = r.reliability ?? 0;
            const contentScore = this.scoreContent(r.content);

            // intent-aware agent weight
            const intentWeight = Number((r as any).weight ?? 1);

            const combined =
                contentScore + reliability * 1.5 + intentWeight * 2;

            return {
                agentId: r.agentId,
                content: r.content.trim(),
                weight: combined,
            };
        });

        // Step 2: group by content
        const groups = new Map<
            string,
            { content: string; items: typeof scored }
        >();

        for (const item of scored) {
            const key = item.content;
            const existing = groups.get(key);
            if (existing) {
                existing.items.push(item);
            } else {
                groups.set(key, { content: item.content, items: [item] });
            }
        }

        // Step 3: compute groupScore
        const rankedGroups = Array.from(groups.values()).map((g) => ({
            content: g.content,
            items: g.items,
            groupScore: g.items.reduce((sum, x) => sum + x.weight, 0),
        }));

        // strict-safe: check before indexing
        if (rankedGroups.length === 0) {
            return {
                content: "[no response]",
                sources: [],
            };
        }

        rankedGroups.sort((a, b) => b.groupScore - a.groupScore);

        const bestGroup = rankedGroups[0];
        if (!bestGroup || bestGroup.items.length === 0) {
            return {
                content: "[no response]",
                sources: [],
            };
        }

        const bestItem = bestGroup.items
            .slice()
            .sort((a, b) => b.weight - a.weight)[0];
        if (!bestItem) {
            return {
                content: "[no response]",
                sources: [],
            };
        }

        // Step 4: merge additional insights
        let output = bestGroup.content;

        for (const g of rankedGroups.slice(1)) {
            const trimmed = g.content.trim();
            if (!trimmed || trimmed.includes("[empty response]")) continue;

            if (!output.includes(trimmed.slice(0, 20))) {
                const agentIds = g.items.map((i) => i.agentId).join(", ");
                output += `\n\nAdditional insight (${agentIds}):\n${trimmed}`;
            }
        }

        // Step 5: normalize weights
        const totalWeight = scored.reduce((n, x) => n + x.weight, 0) || 1;

        const sources = scored.map((s) => ({
            agentId: s.agentId,
            weight: Number((s.weight / totalWeight).toFixed(3)),
        }));

        return {
            content: output,
            sources,
        };
    }

    private scoreContent(content: string): number {
        if (
            !content ||
            content.trim() === "" ||
            content.includes("[empty response]")
        ) {
            return 0.1;
        }

        let score = 1;
        const len = content.length;

        score += Math.min(len / 200, 2);
        if (content.includes("\n")) score += 0.5;
        if (content.includes(":")) score += 0.3;
        if (content.includes("- ")) score += 0.3;

        return score;
    }
}
