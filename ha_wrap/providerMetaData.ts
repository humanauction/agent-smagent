export interface ProviderMetadata {
    id: string;
    provider: string;
    model: string;
    speed?: number;
    cost?: number;
    quality?: number;
    reliability?: number;
}

export interface ProviderScore {
    id: string;
    score: number;
}

export class ProviderMetadataScorer {
    score(
        providers: ProviderMetadata[],
        hints: Partial<{
            preferDeep: boolean | undefined;
            preferFast: boolean | undefined;
            preferCheap: boolean | undefined;
            preferHighQuality: boolean | undefined;
        }>,
    ): ProviderScore[] {
        const scored: ProviderScore[] = [];

        for (const p of providers) {
            let s = 1;

            if (hints.preferFast && p.speed !== undefined) {
                s += p.speed * 0.5;
            }

            if (hints.preferCheap && p.cost !== undefined && p.cost > 0) {
                s += (1 / p.cost) * 0.5;
            }

            if (hints.preferHighQuality && p.quality !== undefined) {
                s += p.quality * 1.0;
            }

            if (hints.preferDeep && p.model.toLowerCase().includes("large")) {
                s += 1.0;
            }

            if (p.reliability !== undefined) {
                s += p.reliability * 0.5;
            }

            scored.push({ id: p.id, score: s });
        }

        return scored.sort((a, b) => b.score - a.score);
    }
}
