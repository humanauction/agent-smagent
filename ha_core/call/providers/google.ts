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

export const GoogleAdapter: ProviderAdapter = {
    name: "google",
    capabilities: {
        streaming: true,
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
            stream: false,
        };

        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GOOGLE_API_KEY}`,
        };

        try {
            const res = await withRetry(
                () =>
                    fetchWithTimeout(
                        "https://api.google.com/v1/chat/completions",
                        payload,
                        req,
                        headers,
                    ),
                req.options?.retry ?? 2,
            );

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

            const json = await jsonParseWithTimeout(res, req);

            const raw =
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
