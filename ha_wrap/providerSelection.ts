import type { SMAGEMessage } from "../ha_core/index.js";
import type { CCRRoutingHints } from "./ccrRouting.js";

import { ProviderMetadataScorer } from "../ha_core/providerMetadata.js";

export interface ProviderSelectionInput {
    session: string;
    messages: SMAGEMessage[];
    providers: {
        depth?: number;
        id: string;
        provider: string;
        model: string;
        speed?: number;
        cost?: number;
        quality?: number;
        reliability?: number;
        options?: Record<string, unknown> | undefined;
    }[];
    hints: CCRRoutingHints;
}

export interface ProviderSelectionResult {
    cost?: number;
    depth?: number;
    id: string;
    model: string;
    options?: Record<string, unknown> | undefined;
    provider: string;
    quality?: number;
    reliability?: number;
}

export class ProviderSelector {
    private scorer = new ProviderMetadataScorer();

    select(input: ProviderSelectionInput): ProviderSelectionResult | null {
        const { providers, hints } = input;

        // Strict-safe: no providers → no selection
        if (providers.length === 0) {
            return null;
        }

        // 1. Score providers (strict-safe: scorer accepts optional booleans)
        const scored = this.scorer.score(providers, {
            preferDeep: hints.preferDeep,
            preferFast: hints.preferFast,
            preferCheap: hints.preferCheap,
            preferHighQuality: hints.preferHighQuality,
            intent: hints.intent,
        });

        // 2. Pick best score (no .at(), no destructuring)
        let bestId: string | null = null;
        let bestScore = -Infinity;

        for (const s of scored) {
            if (s.score > bestScore) {
                bestScore = s.score;
                bestId = s.id;
            }
        }

        // 3. Fallback: first provider (strict-safe)
        const first = providers[0];
        if (!first) {
            return null;
        }

        // If scoring failed to produce an ID, fallback to first provider
        if (!bestId) {
            return {
                id: first.id,
                provider: first.provider,
                model: first.model,
                options: first.options,
            };
        }

        // 4. Find chosen provider (strict-safe)
        const chosen = providers.find((p) => p.id === bestId);

        if (!chosen) {
            return {
                id: first.id,
                provider: first.provider,
                model: first.model,
                options: first.options,
            };
        }

        // 5. Final strict-safe return
        return {
            cost: chosen.cost,
            depth: chosen.depth,
            id: chosen.id,
            model: chosen.model,
            options: chosen.options,
            provider: chosen.provider,
            quality: chosen.quality,
            reliability: chosen.reliability,
        };
    }
}
