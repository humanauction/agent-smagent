import type {
    ProviderAdapter,
    ProviderRequest,
    ProviderResponse,
} from "./interface.js";

import { providers } from "./index.js";
import { normalizeProviderResponse } from "./providerNormalize.js";
import { logProviderIO } from "./utils.js";
import { providerError, ProviderError } from "./errors.js";

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
        try {
            const adapter = this.getAdapter(this.primary);
            return await adapter.call(req);
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
                  );

            logProviderIO(req.session, this.primary, req, {
                role: "assistant",
                content: `[provider error: ${pe.type} - ${pe.message}]`,
            });

            // Retry same provider
            if (pe.retryable && (pe.retryCount ?? 0) < 2) {
                const nextRetry = providerError(
                    pe.type,
                    pe.provider,
                    pe.model,
                    pe.session,
                    pe.message,
                    pe.cause,
                    (pe.retryCount ?? 0) + 1,
                );

                await new Promise((r) =>
                    setTimeout(r, nextRetry.retryDelay ?? 0),
                );

                return this.call(req);
            }

            // No fallback configured
            if (!this.fallback) {
                return normalizeProviderResponse(
                    `[provider failure: ${this.primary} - ${pe.type}]`,
                    "assistant",
                );
            }

            // Fallback attempt
            try {
                const adapter = this.getAdapter(this.fallback);
                return await adapter.call(req);
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
                      );

                logProviderIO(req.session, this.fallback, req, {
                    role: "assistant",
                    content: `[fallback provider error: ${pe2.type} - ${pe2.message}]`,
                });

                return normalizeProviderResponse(
                    `[provider failure: ${this.primary}, fallback failure: ${this.fallback}]`,
                    "assistant",
                );
            }
        }
    }
}
