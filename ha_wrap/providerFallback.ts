import type { SMAGEMessage } from "../ha_core/index.js";
import type { ProviderMetadata } from "./providerMetadata.js";

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

        // 2. Timeout → switch to fastest provider
        if (this.isTimeout(error)) {
            const fast = this.pickBest(allProviders, "speed");
            return {
                provider: fast,
                retry: true,
                reason: "Timeout detected, switching to fastest provider",
            };
        }

        // 3. API error → switch to highest quality
        if (this.isApiError(error)) {
            const quality = this.pickBest(allProviders, "quality");
            return {
                provider: quality,
                retry: true,
                reason: "API error, switching to highest quality provider",
            };
        }

        // 4. Rate limit → switch to cheapest
        if (this.isRateLimit(error)) {
            const cheap = this.pickBest(allProviders, "cost");
            return {
                provider: cheap,
                retry: true,
                reason: "Rate limit hit, switching to cheapest provider",
            };
        }

        // 5. Reliability-aware fallback: prefer most reliable
        const reliable = this.pickBest(allProviders, "reliability");
        if (reliable) {
            return {
                provider: reliable,
                retry: true,
                reason: "Unknown failure, switching to most reliable provider",
            };
        }

        // 6. Final fallback: deepest reasoning model
        const deep = this.pickBest(allProviders, "depth");
        return {
            provider: deep,
            retry: true,
            reason: "Unknown failure, escalating to deepest provider",
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
