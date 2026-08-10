import type { ProviderMetrics, ProviderChainConfig } from "./chainRouter.js";
import { safeMetric, scoreProvider } from "./chainRouter.js";
import { ProviderChainCache } from "./chainCache.js";
import { ProviderChainMemory } from "./chainMemory.js";

// this file contains the scoring UI for the provider chain. mainly for debugging, visualization purposes.
export interface ChainScoreEntry {
    provider: string;
    metrics: Partial<ProviderMetrics>;
    weighted: {
        speed: number;
        cost: number;
        depth: number;
        quality: number;
        reliability: number;
    };
    rawScore: number;
    memoryBoost: number;
    finalScore: number;
    cached: boolean;
}

export class ChainScoringUI {
    static build(
        config: ProviderChainConfig,
        session: string,
        cache: ProviderChainCache,
        memory: ProviderChainMemory,
    ): ChainScoreEntry[] {
        const mem = memory.recall(session);

        return Object.entries(config.metrics).map(([provider, metrics]) => {
            const m = metrics ?? {};

            const weighted = {
                speed: safeMetric(m.speed) * config.weights.speed,
                cost: safeMetric(m.cost) * config.weights.cost,
                depth: safeMetric(m.depth) * config.weights.depth,
                quality: safeMetric(m.quality) * config.weights.quality,
                reliability:
                    safeMetric(m.reliability) * config.weights.reliability,
            };

            const rawScore = scoreProvider(m, config.weights);

            const memoryBoost =
                mem && mem.provider === provider ? mem.score * 0.5 : 0;

            const finalScore = rawScore + memoryBoost;

            const cached = cache.isCached(provider);

            return {
                provider,
                metrics: m,
                weighted,
                rawScore,
                memoryBoost,
                finalScore,
                cached,
            };
        });
    }

    static print(entries: ChainScoreEntry[]): string {
        const lines: string[] = [];

        lines.push("=== Provider Chain Scoring ===");

        for (const e of entries) {
            lines.push(`\nProvider: ${e.provider}`);
            lines.push(`  Raw Metrics: ${JSON.stringify(e.metrics)}`);
            lines.push(`  Weighted: ${JSON.stringify(e.weighted)}`);
            lines.push(`  Raw Score: ${e.rawScore.toFixed(3)}`);
            lines.push(`  Memory Boost: ${e.memoryBoost.toFixed(3)}`);
            lines.push(`  Final Score: ${e.finalScore.toFixed(3)}`);
            lines.push(`  Cached (skip): ${e.cached}`);
        }

        const sorted = [...entries].sort((a, b) => b.finalScore - a.finalScore);
        lines.push("\nFinal Chain Order:");
        lines.push(sorted.map((x) => x.provider).join(" → "));

        return lines.join("\n");
    }
}
