import type { SMAGEMessage, ProviderMetadata } from "../ha_core/index.js";

export interface FallbackContext {
    session: string;
    messages: SMAGEMessage[];
    provider: ProviderMetadata;
    attempt: number;
    error: unknown;
    intent?: string;
}

export interface FallbackResult {
    provider: ProviderMetadata;
    retry: boolean;
    reason: string;
}

export class ProviderFallback {
    private readonly maxAttempts = 3;

    handle(
        ctx: FallbackContext,
        allProviders: ProviderMetadata[],
    ): FallbackResult {
        const { provider, attempt, error } = ctx;

        // 1. Empty/malformed → retry same provider (bounded)
        if (this.isEmptyResponse(error) && attempt < this.maxAttempts) {
            return {
                provider,
                retry: true,
                reason: "Empty response, retrying same provider",
            };
        }

        // 2. Classify error for logging (but do NOT change fallback logic)
        let classification = "unknown failure";
        if (this.isTimeout(error)) classification = "Timeout";
        else if (this.isApiError(error)) classification = "API error";
        else if (this.isRateLimit(error)) classification = "Rate limit";
        else if (this.isEmptyResponse(error)) classification = "Empty response";
        // 3. Reliability-first fallback
        const intent = ctx.intent?.toLowerCase();
        const candidate = allProviders.filter((p) => p.id !== provider.id);
        const scored = candidate.map((p) => {
            let s = 1;
            // baseline reliability-first fallback
            s += (p.reliability ?? 0) * 0.5;
            s += (p.quality ?? 0) * 0.3;
            s += (p.depth ?? 0) * 0.2;

            // intent-aware boosts
            if (intent === "debug") {
                s += (p.depth ?? 0) * 0.6;
                s += (p.quality ?? 0) * 0.4;
                s += (p.reliability ?? 0) * 0.4;
            }

            if (intent === "explain") {
                s += (p.quality ?? 0) * 0.6;
                s += (p.reliability ?? 0) * 0.3;
            }

            if (intent === "refactor") {
                s += (p.depth ?? 0) * 0.7;
            }

            if (intent === "testing") {
                s += (p.quality ?? 0) * 0.5;
                s += (p.reliability ?? 0) * 0.3;
            }

            if (intent === "design") {
                s += (p.depth ?? 0) * 0.7;
                s += (p.quality ?? 0) * 0.5;
            }
            return { provider: p, score: s };
        });

        const next = scored.sort((a, b) => b.score - a.score)[0]?.provider;

        if (next) {
            return {
                provider: next,
                retry: true,
                reason: `${classification} → Reliability-first fallback`,
            };
        }
        return {
            provider,
            retry: false,
            reason: `${classification} → no suitable fallback`,
        };
    }

    private isEmptyResponse(err: unknown): boolean {
        return typeof err === "string" && err.includes("[empty response]");
    }

    private isTimeout(err: unknown): boolean {
        return typeof err === "string" && err.toLowerCase().includes("timeout");
    }

    private isApiError(err: unknown): boolean {
        return typeof err === "string" && err.toLowerCase().includes("api");
    }

    private isRateLimit(err: unknown): boolean {
        return typeof err === "string" && err.toLowerCase().includes("rate");
    }

    private pickBest(
        providers: ProviderMetadata[],
        metric: keyof ProviderMetadata,
    ): ProviderMetadata {
        let best: ProviderMetadata | null = null;

        for (const p of providers) {
            if (!best) {
                best = p;
                continue;
            }
            const current = (p[metric] as number | undefined) ?? 0;
            const previous = (best[metric] as number | undefined) ?? 0;
            if (current > previous) {
                best = p;
            }
        }

        return best!;
    }
}
