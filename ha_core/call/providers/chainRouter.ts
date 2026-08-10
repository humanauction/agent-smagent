import type {
    ProviderAdapter,
    ProviderRequest,
    ProviderResponse,
} from "./interface.js";
import { providers } from "./index.js";
import { providerError, ProviderError } from "./errors.js";
import { normalizeProviderResponse } from "./providerNormalize.js";
import { logProviderIO } from "./utils.js";

// this file defines the multi‑fallback chain with automatic degradation when a provider fails.
// openai → anthropic → google → local
// dynamic ordering based on:
// reliability
// speed
// cost
// depth
// quality

export interface ProviderChainConfig {
    order: string[]; // provider names in priority order
    reliability: Record<string, number>; // dynamic reliability weights
}

export class ProviderChainRouter {
    private chain: string[];

    constructor(config: ProviderChainConfig) {
        // Sort providers by reliability weight (descending)
        this.chain = [...config.order].sort((a, b) => {
            const ra = config.reliability[a] ?? 0;
            const rb = config.reliability[b] ?? 0;
            return rb - ra;
        });
    }

    private getAdapter(name: string): ProviderAdapter {
        const adapter = providers[name];
        if (!adapter) throw new Error(`Unknown provider: ${name}`);
        return adapter;
    }

    async call(req: ProviderRequest): Promise<ProviderResponse> {
        let lastError: ProviderError | null = null;

        for (const providerName of this.chain) {
            try {
                const adapter = this.getAdapter(providerName);
                const res = await adapter.call(req);

                logProviderIO(req.session, providerName, req, res);
                return res;
            } catch (err: any) {
                const pe: ProviderError = err?.type
                    ? err
                    : providerError(
                          "internal",
                          providerName,
                          req.model,
                          req.session,
                          String(err?.message ?? err),
                          err,
                      );

                lastError = pe;

                logProviderIO(req.session, providerName, req, {
                    role: "assistant",
                    content: `[chain provider error: ${pe.type} - ${pe.message}]`,
                });

                // Retry same provider if retryable
                if (pe.retryable && (pe.retryCount ?? 0) < 2) {
                    const retryErr = providerError(
                        pe.type,
                        pe.provider,
                        pe.model,
                        pe.session,
                        pe.message,
                        pe.cause,
                        (pe.retryCount ?? 0) + 1,
                    );

                    await new Promise((r) =>
                        setTimeout(r, retryErr.retryDelay ?? 0),
                    );

                    try {
                        const adapter = this.getAdapter(providerName);
                        const res = await adapter.call(req);
                        return res;
                    } catch {
                        // continue to next provider in chain
                    }
                }

                // Otherwise continue to next provider
            }
        }

        // All providers failed
        return normalizeProviderResponse(
            `[provider chain failure: ${this.chain.join(" → ")}]`,
            "assistant",
        );
    }
}
