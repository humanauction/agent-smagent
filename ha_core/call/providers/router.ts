import type {
    ProviderAdapter,
    ProviderRequest,
    ProviderResponse,
} from "./interface.js";

import { providers } from "./index.js";
import { normalizeProviderResponse } from "./providerNormalize.js";
import { logProviderIO } from "./utils.js";
import { providerError, ProviderError } from "./errors.js";

/**
 * ProviderRouter:
 * - primary provider
 * - fallback provider
 * - strict-mode safe
 * - deterministic
 */
export class ProviderRouter {
    primary: string;
    fallback: string | null;

    constructor(
        primary: string = "openai",
        fallback: string | null = "anthropic",
    ) {
        this.primary = primary;
        this.fallback = fallback;
    }

    getAdapter(name: string): ProviderAdapter {
        const adapter = providers[name];
        if (!adapter) throw new Error(`Unknown provider: ${name}`);
        return adapter;
    }

    async call(req: ProviderRequest): Promise<ProviderResponse> {
        // 1. Primary provider attempt
        try {
            const adapter = this.getAdapter(this.primary);
            const res = await adapter.call(req);
            return res;
        } catch (err: any) {
            const pe: ProviderError = err?.type
                ? err
                : providerError(
                      "internal",
                      this.primary,
                      req.model,
                      req.session,
                      String(err?.message ?? err),
                      err,
                      false,
                  );
            // 2. Log primary failure
            logProviderIO(req.session, this.primary, req, {
                role: "assistant",
                content: `[provider error: ${pe.type} - ${pe.message}]`,
            });

            // 3. If no fallback → return normalized error
            if (!this.fallback || !pe.retryable) {
                return normalizeProviderResponse(
                    `[provider failure: ${this.primary} - ${pe.type}]`,
                    "assistant",
                );
            }
            // 4. Fallback attempt
            try {
                const adapter = this.getAdapter(this.fallback);
                const res = await adapter.call(req);
                return res;
            } catch (err2: any) {
                const pe2: ProviderError = err2?.type
                    ? err2
                    : providerError(
                          "internal",
                          this.fallback,
                          req.model,
                          req.session,
                          String(err2?.message ?? err2),
                          err2,
                          false,
                      );
                // 5. Log fallback failure
                logProviderIO(req.session, this.fallback, req, {
                    role: "assistant",
                    content: `[fallback provider error: ${pe2.type} - ${pe2.message}]`,
                });

                // 6. Final normalized error
                return normalizeProviderResponse(
                    `[provider failure: ${this.primary}, fallback failure: ${this.fallback}]`,
                    "assistant",
                );
            }
        }
    }
}
