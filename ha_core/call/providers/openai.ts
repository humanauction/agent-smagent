import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import type { ProviderAdapter } from "./interface.js";
import { withRetry, providerError, isProviderError } from "./errors.js";
import { ProviderChainTelemetry } from "./chainTelemetry.js";

/**
 * Timeout helpers
 */
const DEFAULT_TIMEOUT_MS = 15000; // 15s hard cap
const JSON_TIMEOUT_MS = 5000; // 5s JSON parse cap
const MAX_JSON_SIZE = 5 * 1024 * 1024; // 5MB safety cap

function timeoutGuard<T>(
    promise: Promise<T>,
    ms: number,
    label: string,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = setTimeout(() => {
            reject(new Error(`timeout: ${label}`));
        }, ms);

        promise
            .then((v) => {
                clearTimeout(id);
                resolve(v);
            })
            .catch((err) => {
                clearTimeout(id);
                reject(err);
            });
    });
}

export const OpenAIAdapter: ProviderAdapter = {
    name: "openai",
    capabilities: {
        streaming: true,
        tools: true,
        systemRole: true,
        maxTokens: 128000,
    },

    async call(req) {
        const telemetry = new ProviderChainTelemetry();

        // --- safe telemetry ---
        try {
            telemetry.record({
                session: req.session,
                provider: "openai",
                stage: "provider_call",
                model: req.model,
                messages: req.messages.length,
            });
        } catch {
            /* never block provider call */
        }

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

        //  AbortController + timeout race
        const fetchWithTimeout = async () => {
            const controller = new AbortController();
            const timer = setTimeout(
                () => controller.abort(),
                DEFAULT_TIMEOUT_MS,
            );

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
                        signal: controller.signal,
                    },
                );

                clearTimeout(timer);
                return res;
            } catch (err: any) {
                clearTimeout(timer);

                // classify abort as timeout
                if (
                    err?.name === "AbortError" ||
                    String(err).includes("timeout")
                ) {
                    throw providerError(
                        "timeout",
                        "openai",
                        req.model,
                        req.session,
                        "Request timed out",
                        err,
                    );
                }

                throw err;
            }
        };

        try {
            /**
             * retry loop breaks on:
             * - timeout
             * - hung promise via timeoutGuard
             */
            const res = await withRetry(
                () =>
                    timeoutGuard(
                        fetchWithTimeout(),
                        DEFAULT_TIMEOUT_MS,
                        "fetch",
                    ).then((r) => r),
                req.options?.retry ?? 2,
            );

            // HTTP-level error classification
            if (!res.ok) {
                const status = res.status;

                if (status === 429) {
                    throw providerError(
                        "rate_limit",
                        "openai",
                        req.model,
                        req.session,
                        "Rate limit exceeded",
                        { status },
                    );
                }

                if (status >= 500) {
                    throw providerError(
                        "transport",
                        "openai",
                        req.model,
                        req.session,
                        `Transport error: ${status}`,
                        { status },
                    );
                }

                if (status === 401 || status === 403) {
                    throw providerError(
                        "auth",
                        "openai",
                        req.model,
                        req.session,
                        "Authentication error",
                        { status },
                    );
                }

                throw providerError(
                    "api",
                    "openai",
                    req.model,
                    req.session,
                    `API error: ${status}`,
                    { status },
                );
            }

            /**
             * Hardened JSON parse:
             * - timeout guard
             * - size guard
             */
            const json = await timeoutGuard(
                res.clone().json(),
                JSON_TIMEOUT_MS,
                "json-parse",
            ).catch((err) => {
                throw providerError(
                    "timeout",
                    "openai",
                    req.model,
                    req.session,
                    "JSON parse timeout",
                    err,
                    0, // retryCount
                );
            });

            // size guard
            const rawText = JSON.stringify(json);
            if (rawText.length > MAX_JSON_SIZE) {
                throw providerError(
                    "content",
                    "openai",
                    req.model,
                    req.session,
                    "Response JSON too large",
                    { size: rawText.length },
                );
            }

            /**
             * Extract content safely
             */
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

            const response = shapeOutput("assistant", raw);

            logProviderIO(req.session, "openai", req, response);

            // safe telemetry
            try {
                telemetry.record({
                    session: req.session,
                    provider: "openai",
                    stage: "provider_response",
                    tokens: response.meta?.tokens,
                });
            } catch {
                /* never block provider call */
            }

            return response;
        } catch (err) {
            // Already-normalized ProviderError
            if (isProviderError(err)) {
                logProviderIO(req.session, "openai", req, {
                    role: "assistant",
                    content: `[provider error: ${err.type} - ${err.message}]`,
                });
                throw err;
            }

            /**
             * timeout detection for unknown errors
             */
            const msg = String((err as any)?.message ?? err);

            const isTimeout =
                msg.includes("timeout") ||
                msg.includes("ETIMEDOUT") ||
                msg.includes("AbortError") ||
                msg.includes("fetch failed");

            const pe = isTimeout
                ? providerError(
                      "timeout",
                      "openai",
                      req.model,
                      req.session,
                      "Request timed out",
                      err,
                      0, //retryCount
                  )
                : providerError(
                      "internal",
                      "openai",
                      req.model,
                      req.session,
                      msg,
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
