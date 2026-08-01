import type {
    ProviderAdapter,
    ProviderRequest,
    ProviderResponse,
} from "./interface.js";

import { providers } from "./index.js";
import { normalizeProviderResponse } from "./providerNormalize.js";
import { logProviderIO } from "./utils.js";

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
            // 2. Log primary failure
            logProviderIO(req.session, this.primary, req, {
                role: "assistant",
                content: `[provider error: ${String(err?.message ?? err)}]`,
            });

            // 3. If no fallback → return normalized error
            if (!this.fallback) {
                return normalizeProviderResponse(
                    `[provider failure: ${this.primary}]`,
                    "assistant",
                );
            }

            // 4. Fallback attempt
            try {
                const adapter = this.getAdapter(this.fallback);
                const res = await adapter.call(req);
                return res;
            } catch (err2: any) {
                // 5. Log fallback failure
                logProviderIO(req.session, this.fallback, req, {
                    role: "assistant",
                    content: `[fallback provider error: ${String(err2?.message ?? err2)}]`,
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
