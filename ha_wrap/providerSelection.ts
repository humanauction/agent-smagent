import type { SMAGEMessage } from "../ha_core/index.js";
import { learn } from "../ha_learn/index.js";

export interface ProviderMetadata {
    id: string;
    provider: string;
    model: string;
    // metadata for selection logic
    cost?: number; // relative cost index
    speed?: number; // relative speed index
    depth?: number; // reasoning depth index
    quality?: number; // output quality index
}

export interface ProviderSelectionInput {
    session: string;
    messages: SMAGEMessage[];
    providers: ProviderMetadata[];
}

export interface ProviderSelectionResult {
    id: string;
    provider: string;
    model: string;
}

export class ProviderSelector {
    select(input: ProviderSelectionInput): ProviderSelectionResult {
        const { session, messages, providers } = input;

        if (providers.length === 0) {
            throw new Error("ProviderSelector: no providers available.");
        }

        // 1. Extract user query
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const userQuery = lastUser?.content ?? "";
        // --- Helper: safe reducer ---
        const pickBest = (metric: keyof ProviderMetadata): ProviderMetadata => {
            let best: ProviderMetadata | null = null;

            for (const p of providers) {
                if (!best) {
                    best = p;
                    continue;
                }
                const current = p[metric] ?? 0;
                const previous = best[metric] ?? 0;
                if (current > previous) {
                    best = p;
                }
            }

            // best is guaranteed non-null because providers.length > 0
            return best!;
        };

        // --- Deep reasoning anchor ---
        // 2. Score learned anchors
        const learnedAnchors = learn.scoreRelevance(session, userQuery);
        const top = learnedAnchors[0];

        // 3. If anchor indicates deep reasoning → pick highest depth provider
        if (top && top.text.includes("deep")) {
            const deepProvider = pickBest("depth");

            return {
                id: deepProvider.id,
                provider: deepProvider.provider,
                model: deepProvider.model,
            };
        }

        // 4. If anchor indicates speed → pick fastest provider
        if (top && top.text.includes("fast")) {
            const fastProvider = pickBest("speed");

            return {
                id: fastProvider.id,
                provider: fastProvider.provider,
                model: fastProvider.model,
            };
        }

        // 5. Default: pick highest quality provider
        const bestQuality = pickBest("quality");
        return {
            id: bestQuality.id,
            provider: bestQuality.provider,
            model: bestQuality.model,
        };
    }
}
