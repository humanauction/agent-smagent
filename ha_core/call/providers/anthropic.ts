import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import type { ProviderAdapter } from "./interface.js";
import { withRetry, providerError, isProviderError } from "./errors.js";
import { ProviderChainTelemetry } from "./chainTelemetry.js";

import {
    fetchWithTimeout,
    jsonParseWithTimeout,
    safeTelemetry,
    normalizeTimeoutUnknown,
} from "./timeout.js";

export const AnthropicAdapter: ProviderAdapter = {
    name: "anthropic",
    capabilities: {
        streaming: true,
        tools: true,
        systemRole: true,
        maxTokens: 128000,
    },

    async call(req) {
        const telemetry = new ProviderChainTelemetry();

        // safe telemetry
        safeTelemetry(() =>
            telemetry.record({
                session: req.session,
                provider: "anthropic",
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
            stream: false,
        };

        const headers = {
            "Content-Type": "application/json",
            "X-API-Key": `${process.env.ANTHROPIC_API_KEY}`,
        };

        try {
            /**
             * Hardened fetch + retry
             */
            const res = await withRetry(
                () =>
                    fetchWithTimeout(
                        "https://api.anthropic.com/v1/messages",
                        payload,
                        req,
                        headers,
                    ),
                req.options?.retry ?? 2,
            );

            /**
             * HTTP-level error classification
             */
            if (!res.ok) {
                const status = res.status;

                if (status === 429) {
                    throw providerError(
                        "rate_limit",
                        req.provider,
                        req.model,
                        req.session,
                        "Rate limit exceeded",
                        { status },
                    );
                }

                if (status >= 500) {
                    throw providerError(
                        "transport",
                        req.provider,
                        req.model,
                        req.session,
                        `Transport error: ${status}`,
                        { status },
                    );
                }

                if (status === 401 || status === 403) {
                    throw providerError(
                        "auth",
                        req.provider,
                        req.model,
                        req.session,
                        "Authentication error",
                        { status },
                    );
                }

                throw providerError(
                    "api",
                    req.provider,
                    req.model,
                    req.session,
                    `API error: ${status}`,
                    { status },
                );
            }

            /**
             * Hardened JSON parse
             */
            const json = await jsonParseWithTimeout(res, req);

            /**
             * Extract content safely
             */
            const raw =
                json?.content?.[0]?.text ??
                json?.choices?.[0]?.message?.content ??
                json?.choices?.[0]?.text ??
                "";

            if (!raw || raw.trim() === "") {
                throw providerError(
                    "content",
                    req.provider,
                    req.model,
                    req.session,
                    "Empty or malformed response",
                    json,
                );
            }

            const response = shapeOutput("assistant", raw);

            logProviderIO(req.session, req.provider, req, response);

            // safe telemetry
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
            /**
             * Already-normalized ProviderError
             */
            if (isProviderError(err)) {
                logProviderIO(req.session, req.provider, req, {
                    role: "assistant",
                    content: `[provider error: ${err.type} - ${err.message}]`,
                });
                throw err;
            }

            /**
             * Unknown → classify timeout or internal
             */
            const pe = normalizeTimeoutUnknown(err, req);

            logProviderIO(req.session, req.provider, req, {
                role: "assistant",
                content: `[provider error: ${pe.type} - ${pe.message}]`,
            });

            throw pe;
        }
    },
};
