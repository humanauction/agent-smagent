import { normalizeProviderResponse } from "./providerNormalize.js";
import { logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import type { ProviderAdapter } from "./interface.js";
import { providerError } from "./errors.js";

export const OpenAIAdapter: ProviderAdapter = {
    name: "openai",

    async call(req) {
        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
        };

        try {
            const res = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (!res.ok) {
                if (res.status === 429) {
                    throw providerError(
                        "rate_limit",
                        "openai",
                        req.model,
                        req.session,
                        "Rate limit exceeded",
                        { status: res.status },
                    );
                }

                if (res.status >= 500) {
                    throw providerError(
                        "transport",
                        "openai",
                        req.model,
                        req.session,
                        `Transport error: ${res.status}`,
                        { status: res.status },
                    );
                }

                if (res.status === 401 || res.status === 403) {
                    throw providerError(
                        "auth",
                        "openai",
                        req.model,
                        req.session,
                        "Authentication error",
                        { status: res.status },
                    );
                }

                throw providerError(
                    "api",
                    "openai",
                    req.model,
                    req.session,
                    `API error: ${res.status}`,
                    { status: res.status },
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
                    "openai",
                    req.model,
                    req.session,
                    "Empty or malformed response",
                    json,
                );
            }

            const response = normalizeProviderResponse(raw, "assistant");
            logProviderIO(req.session, "openai", req, response);
            return response;
        } catch (err: any) {
            if (err?.type) {
                logProviderIO(req.session, "openai", req, {
                    role: "assistant",
                    content: `[provider error: ${err.type} - ${err.message}]`,
                });
                throw err;
            }

            const pe = providerError(
                "internal",
                "openai",
                req.model,
                req.session,
                String(err?.message ?? err),
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
