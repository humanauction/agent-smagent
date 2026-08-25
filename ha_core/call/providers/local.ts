import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import type { ProviderAdapter } from "./interface.js";

import { withRetry, providerError, isProviderError } from "./errors.js";

import { ProviderChainTelemetry } from "./chainTelemetry.js";

import {
    timeoutGuard,
    safeTelemetry,
    normalizeTimeoutUnknown,
    DEFAULT_TIMEOUT_MS,
} from "./timeout.js";

export const LocalAdapter: ProviderAdapter = {
    name: "local",
    capabilities: {
        streaming: false,
        tools: true,
        systemRole: true,
        maxTokens: 128000,
    },

    async call(req) {
        const telemetry = new ProviderChainTelemetry();

        safeTelemetry(() =>
            telemetry.record({
                session: req.session,
                provider: req.provider,
                stage: "provider_call",
                model: req.model,
                messages: req.messages.length,
            }),
        );

        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
            temperature: req.options?.temperature ?? 0.7,
            max_tokens: req.options?.maxTokens ?? 2048,
        };

        try {
            /**
             * Local inference PLACEHOLDER
             * timeoutGuard + retry
             */
            const raw = await withRetry(
                () =>
                    timeoutGuard(
                        // TODO: integrate llama.cpp / python bridge
                        Promise.resolve("[local placeholder response]"),
                        DEFAULT_TIMEOUT_MS,
                        "local-inference",
                    ),
                req.options?.retry ?? 2,
            );

            if (!raw || raw.trim() === "") {
                throw providerError(
                    "content",
                    req.provider,
                    req.model,
                    req.session,
                    "Empty or malformed local model response",
                    raw,
                );
            }

            const response = shapeOutput("assistant", raw);

            logProviderIO(req.session, req.provider, req, response);

            safeTelemetry(() =>
                telemetry.record({
                    session: req.session,
                    provider: req.provider,
                    stage: "provider_response",
                    tokens: response.meta?.tokens,
                }),
            );

            return response;
        } catch (err) {
            if (isProviderError(err)) {
                logProviderIO(req.session, req.provider, req, {
                    role: "assistant",
                    content: `[provider error: ${err.type} - ${err.message}]`,
                });
                throw err;
            }

            const pe = normalizeTimeoutUnknown(err, req);

            logProviderIO(req.session, req.provider, req, {
                role: "assistant",
                content: `[provider error: ${pe.type} - ${pe.message}]`,
            });

            throw pe;
        }
    },
};
