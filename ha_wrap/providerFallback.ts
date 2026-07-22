import type { SMAGEMessage } from "../ha_core/index.js";
import type { ProviderMetadata } from "./providerSelection.js";

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

    /**
     * Main fallback entry point.
     * Decides whether to retry the same provider, switch provider,
     * or escalate to a deeper model.
     */
    handle(
        ctx: FallbackContext,
        allProviders: ProviderMetadata[],
    ): FallbackResult {
        const { provider, attempt, error } = ctx;

        // 1. If provider returned empty or malformed output → retry once
        if (this.isEmptyResponse(error) && attempt < this.maxAttempts) {
            return {
                provider,
                retry: true,
                reason: "Empty response, retrying same provider",
            };
        }

        // 2. If provider timed out → switch to fastest provider
        if (this.isTimeout(error)) {
            const fast = this.pickBest(allProviders, "speed");
            return {
                provider: fast,
                retry: true,
                reason: "Timeout detected, switching to fastest provider",
            };
        }

        // 3. If provider failed due to API error → switch to highest quality
        if (this.isApiError(error)) {
            const quality = this.pickBest(allProviders, "quality");
            return {
                provider: quality,
                retry: true,
                reason: "API error, switching to highest quality provider",
            };
        }

        // 4. If provider failed due to rate limit → switch to cheapest
        if (this.isRateLimit(error)) {
            const cheap = this.pickBest(allProviders, "cost");
            return {
                provider: cheap,
                retry: true,
                reason: "Rate limit hit, switching to cheapest provider",
            };
        }

        // 5. If all else fails → escalate to deepest reasoning model
        const deep = this.pickBest(allProviders, "depth");
        return {
            provider: deep,
            retry: true,
            reason: "Unknown failure, escalating to deepest provider",
        };
    }

    // ------------------------
    // Error classification
    // ------------------------

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

    // ------------------------
    // Safe provider selection
    // ------------------------

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
            const current = p[metric] ?? 0;
            const previous = best[metric] ?? 0;
            if (current > previous) {
                best = p;
            }
        }

        return best!;
    }
}
