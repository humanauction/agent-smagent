import type { OrchestratedResult } from "./multi_agent.js";

/// ResponseBlender blends multiple agent responses into a single coherent one.
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
        const scored: {
            agentId: string;
            content: string;
            weight: number;
        }[] = [];

        for (const r of results) {
            scored.push({
                agentId: r.agentId,
                content: r.content,
                weight: this.score(r.content),
            });
        }

        const total = scored.reduce((sum, r) => sum + r.weight, 0) || 1;

        const normalized = scored.map((r) => ({
            agentId: r.agentId,
            content: r.content,
            weight: r.weight / total,
        }));

        const sorted = [...normalized].sort((a, b) => b.weight - a.weight);

        const primary = sorted.at(0);
        if (!primary) {
            return {
                content: "[no response]",
                sources: [],
            };
        }

        let output = primary.content.trim();

        for (let i = 1; i < sorted.length; i++) {
            const o = sorted.at(i);
            if (!o) continue;

            const trimmed = o.content.trim();
            if (!trimmed || trimmed.includes("[empty response]")) continue;

            if (!output.includes(trimmed.slice(0, 20))) {
                output += `\n\nAdditional insight (${o.agentId}):\n${trimmed}`;
            }
        }

        return {
            content: output,
            sources: sorted.map((n) => ({
                agentId: n.agentId,
                weight: Number(n.weight.toFixed(3)),
            })),
        };
    }

    private score(content: string): number {
        if (
            !content ||
            content.trim() === "" ||
            content.includes("[empty response]")
        ) {
            return 0.1;
        }

        let score = 1;

        score += Math.min(content.length / 200, 2);
        if (content.includes("\n")) score += 0.5;
        if (content.includes(":")) score += 0.3;
        if (content.includes("- ")) score += 0.3;

        return score;
    }
}
