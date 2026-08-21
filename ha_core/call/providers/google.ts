import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import type { ProviderAdapter } from "./interface.js";
import { withRetry, providerError, isProviderError } from "./errors.js";
import { ProviderChainTelemetry } from "./chainTelemetry.js";

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
        telemetry.record({
            session: req.session,
            provider: "google",
            stage: "provider_call",
            model: req.model,
            messages: req.messages.length,
        });

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

        try {
            const res = await withRetry(
                () =>
                    fetch("https://api.google.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${process.env.GOOGLE_API_KEY}`,
                        },
                        body: JSON.stringify(payload),
                    }).then((r) => r.json()),
                req.options?.retry ?? 2,
            );
            // HTTP-level error classification
            if (!res.ok) {
                const status = res.status;

                if (status === 429) {
                    throw providerError(
                        "rate_limit",
                        "google",
                        req.model,
                        req.session,
                        "Rate limit exceeded",
                        { status },
                    );
                }

                if (status >= 500) {
                    throw providerError(
                        "transport",
                        "google",
                        req.model,
                        req.session,
                        `Transport error: ${status}`,
                        { status },
                    );
                }

                if (status === 401 || status === 403) {
                    throw providerError(
                        "auth",
                        "google ",
                        req.model,
                        req.session,
                        "Authentication error",
                        { status },
                    );
                }

                throw providerError(
                    "api",
                    "google",
                    req.model,
                    req.session,
                    `API error: ${status}`,
                    { status },
                );
            }

            const json = await res.json();

            const raw =
                json?.choices?.[0]?.message?.content ??
                json?.choices?.[0]?.text ??
                "";

            if (!raw || raw.trim() === "") {
                throw providerError(
                    "content",
                    "google",
                    req.model,
                    req.session,
                    "Empty or malformed response",
                    json,
                );
            }

            const response = shapeOutput("assistant", raw);

            logProviderIO(req.session, "google", req, response);

            telemetry.record({
                session: req.session,
                provider: "google",
                stage: "provider_response",
                tokens: response.meta?.tokens,
            });

            return response;
        } catch (err) {
            // Already-normalized ProviderError
            if (isProviderError(err)) {
                logProviderIO(req.session, "google", req, {
                    role: "assistant",
                    content: `[provider error: ${err.type} - ${err.message}]`,
                });
                throw err;
            }

            // Unknown error → normalize
            const pe = providerError(
                "internal",
                "google",
                req.model,
                req.session,
                String((err as any)?.message ?? err),
                err,
            );

            logProviderIO(req.session, "google", req, {
                role: "assistant",
                content: `[provider error: ${pe.type} - ${pe.message}]`,
            });

            throw pe;
        }
    },
};
