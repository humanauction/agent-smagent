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
}

export class ProviderMetadataScorer {
    score(
        providers: ProviderMetadata[],
        prefs: ProviderScoringPreferences = {},
    ): Array<{ id: string; score: number }> {
        return providers.map((p) => {
            let score = 0;

            score += (p.reliability ?? 0) * 0.35;
            score += (p.quality ?? 0) * 0.3;
            score += (p.speed ?? 0) * 0.2;
            score += (p.depth ?? 0) * 0.15;

            if (prefs.preferDeep) score += (p.depth ?? 0) * 0.5;
            if (prefs.preferFast) score += (p.speed ?? 0) * 0.5;
            if (prefs.preferHighQuality) score += (p.quality ?? 0) * 0.5;
            if (prefs.preferCheap) score -= (p.cost ?? 0) * 0.5;

            return { id: p.id, score };
        });
    }
}
