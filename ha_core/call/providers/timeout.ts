// ha_core/call/providers/timeout.ts

import { providerError } from "./errors.js";
import type { ProviderError } from "./errors.js";
import type { ProviderRequest } from "./interface.js";

/**
 * Global timeout constants
 */
export const DEFAULT_TIMEOUT_MS = 15000; // fetch timeout
export const JSON_TIMEOUT_MS = 5000; // JSON parse timeout
export const MAX_JSON_SIZE = 5 * 1024 * 1024; // 5MB safety cap

/**
 * Generic timeout guard for any promise
 */
export function timeoutGuard<T>(
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

/**
 * Unified fetch-with-timeout wrapper
 */
export async function fetchWithTimeout(
    url: string,
    payload: any,
    req: ProviderRequest,
    headers: Record<string, string>,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timer);
        return res;
    } catch (err: any) {
        clearTimeout(timer);

        const msg = String(err?.message ?? err);

        if (
            err?.name === "AbortError" ||
            msg.includes("timeout") ||
            msg.includes("ETIMEDOUT") ||
            msg.includes("fetch failed")
        ) {
            throw providerError(
                "timeout",
                req.provider,
                req.model,
                req.session,
                "Request timed out",
                err,
                0,
            );
        }

        throw err;
    }
}

/**
 * Unified JSON parse with timeout + size guard
 */
export async function jsonParseWithTimeout(
    res: Response,
    req: ProviderRequest,
): Promise<any> {
    try {
        const json = await timeoutGuard(
            res.clone().json(),
            JSON_TIMEOUT_MS,
            "json-parse",
        );

        const rawText = JSON.stringify(json);
        if (rawText.length > MAX_JSON_SIZE) {
            throw providerError(
                "content",
                req.provider,
                req.model,
                req.session,
                "Response JSON too large",
                { size: rawText.length },
                0,
            );
        }

        return json;
    } catch (err) {
        throw providerError(
            "timeout",
            req.provider,
            req.model,
            req.session,
            "JSON parse timeout",
            err,
            0,
        );
    }
}

/**
 * telemetry wrapper — safe, never blocks provider call
 */
export function safeTelemetry(fn: () => void): void {
    try {
        fn();
    } catch {
        /* never block provider call */
    }
}

/**
 * Unified timeout classification for unknown errors
 */
export function normalizeTimeoutUnknown(
    err: unknown,
    req: ProviderRequest,
): ProviderError {
    const msg = String((err as any)?.message ?? err);

    const isTimeout =
        msg.includes("timeout") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("AbortError") ||
        msg.includes("fetch failed");

    return isTimeout
        ? providerError(
              "timeout",
              req.provider,
              req.model,
              req.session,
              "Request timed out",
              err,
              0,
          )
        : providerError(
              "internal",
              req.provider,
              req.model,
              req.session,
              msg,
              err,
          );
}
