import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import type { ProviderAdapter } from "./interface.js";
import { withRetry, providerError, isProviderError } from "./errors.js";
import { ProviderChainTelemetry } from "./chainTelemetry.js";

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
        telemetry.record({
            session: req.session,
            provider: "anthropic",
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

        // TODO: fill in actual Anthropic request
        try {
            const res = await withRetry(
                () =>
                    fetch("https://api.anthropic.com/v1/messages", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-API-Key": `${process.env.ANTHROPIC_API_KEY}`,
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
                        "anthropic",
                        req.model,
                        req.session,
                        "Rate limit exceeded",
                        { status },
                    );
                }

                if (status >= 500) {
                    throw providerError(
                        "transport",
                        "anthropic",
                        req.model,
                        req.session,
                        `Transport error: ${status}`,
                        { status },
                    );
                }

                if (status === 401 || status === 403) {
                    throw providerError(
                        "auth",
                        "anthropic",
                        req.model,
                        req.session,
                        "Authentication error",
                        { status },
                    );
                }

                throw providerError(
                    "api",
                    "anthropic",
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
                    "anthropic",
                    req.model,
                    req.session,
                    "Empty or malformed response",
                    json,
                );
            }

            const response = shapeOutput("assistant", raw);

            logProviderIO(req.session, "anthropic", req, response);

            telemetry.record({
                session: req.session,
                provider: "anthropic",
                stage: "provider_response",
                tokens: response.meta?.tokens,
            });

            return response;
        } catch (err) {
            // Already-normalized ProviderError
            if (isProviderError(err)) {
                logProviderIO(req.session, "anthropic", req, {
                    role: "assistant",
                    content: `[provider error: ${err.type} - ${err.message}]`,
                });
                throw err;
            }

            // Unknown error → normalize
            const pe = providerError(
                "internal",
                "anthropic",
                req.model,
                req.session,
                String((err as any)?.message ?? err),
                err,
            );

            logProviderIO(req.session, "openai", req, {
                role: "assistant",
                content: `[provider error: ${pe.type} - ${pe.message}]`,
            });

            throw pe;
        }
    },
};
