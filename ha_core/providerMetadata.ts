// this file defines provider metadata including their capabilities, scoring preferences.

export interface ProviderMetadata {
    id: string;
    provider: string;
    model: string;
    speed?: number;
    cost?: number;
    quality?: number;
    reliability?: number;
    depth?: number;
    options?: Record<string, unknown> | undefined;
}

export interface ProviderScoringPreferences {
    preferDeep?: boolean | undefined;
    preferFast?: boolean | undefined;
    preferCheap?: boolean | undefined;
    preferHighQuality?: boolean | undefined;
    intent?: string | undefined;
}

export interface ProviderScore {
    id: string;
    score: number;
}

export class ProviderMetadataScorer {
    score(
        providers: ProviderMetadata[],
        prefs: ProviderScoringPreferences = {},
    ): ProviderScore[] {
        const scored: ProviderScore[] = [];

        for (const p of providers) {
            let s = 1;

            // --- Baseline structural scoring ---
            s += (p.reliability ?? 0) * 0.35;
            s += (p.quality ?? 0) * 0.3;
            s += (p.speed ?? 0) * 0.2;
            s += (p.depth ?? 0) * 0.15;

            // --- Preference boosts ---
            if (prefs.preferDeep) s += (p.depth ?? 0) * 0.5;
            if (prefs.preferFast) s += (p.speed ?? 0) * 0.5;
            if (prefs.preferHighQuality) s += (p.quality ?? 0) * 0.5;
            if (prefs.preferCheap) s -= (p.cost ?? 0) * 0.5;

            // --- Intent‑aware scoring ---
            const intent = prefs.intent?.toLowerCase();

            if (intent === "debug") {
                if (p.depth) s += p.depth * 0.6;
                if (p.quality) s += p.quality * 0.4;
                if (p.reliability) s += p.reliability * 0.4;
            }

            if (intent === "explain") {
                if (p.quality) s += p.quality * 0.6;
                if (p.reliability) s += p.reliability * 0.3;
            }

            if (intent === "refactor") {
                if (p.depth) s += p.depth * 0.7;
            }

            if (intent === "testing") {
                if (p.quality) s += p.quality * 0.5;
                if (p.reliability) s += p.reliability * 0.3;
            }

            if (intent === "design") {
                if (p.depth) s += p.depth * 0.7;
                if (p.quality) s += p.quality * 0.5;
            }

            scored.push({ id: p.id, score: s });
        }

        return scored.sort((a, b) => b.score - a.score);
    }
}
