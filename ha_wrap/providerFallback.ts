import type { SMAGEMessage, ProviderMetadata } from "../ha_core/index.js";

export interface FallbackContext {
    session: string;
    messages: SMAGEMessage[];
    provider: ProviderMetadata;
    attempt: number;
    error: unknown;
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
        const next = [...allProviders]
            .filter((p) => p.id !== provider.id)
            .sort(
                (a, b) =>
                    (b.reliability ?? 0) - (a.reliability ?? 0) ||
                    (b.quality ?? 0) - (a.quality ?? 0) ||
                    (b.depth ?? 0) - (a.depth ?? 0),
            )[0];

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
