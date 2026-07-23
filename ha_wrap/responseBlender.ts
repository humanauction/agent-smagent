import type { OrchestratedResult } from "./multi_agent.js";

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
            const single = results[0];
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
        const scored: {
            agentId: string;
            content: string;
            weight: number;
        }[] = [];

        for (const r of results) {
            const reliability = r.reliability ?? 0;
            const contentScore = this.scoreContent(r.content);
            const combined = contentScore + reliability * 1.5;

            scored.push({
                agentId: r.agentId,
                content: r.content,
                weight: combined,
            });
        }

        let total = 0;
        for (const s of scored) total += s.weight;
        if (total === 0) total = 1;

        const normalized: {
            agentId: string;
            content: string;
            weight: number;
        }[] = [];

        for (const s of scored) {
            normalized.push({
                agentId: s.agentId,
                content: s.content,
                weight: s.weight / total,
            });
        }

        const sorted = normalized.slice().sort((a, b) => b.weight - a.weight);

        const primary = sorted[0];
        if (!primary) {
            return {
                content: "[no response]",
                sources: [],
            };
        }

        let output = primary.content.trim();

        for (let i = 1; i < sorted.length; i++) {
            const o = sorted[i];
            if (!o) continue;

            const trimmed = o.content.trim();
            if (!trimmed || trimmed.includes("[empty response]")) continue;

            if (!output.includes(trimmed.slice(0, 20))) {
                output += `\n\nAdditional insight (${o.agentId}):\n${trimmed}`;
            }
        }

        return {
            content: output,
            sources: sorted
                .filter((n) => !!n)
                .map((n) => ({
                    agentId: n.agentId,
                    weight: Number(n.weight.toFixed(3)),
                })),
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
