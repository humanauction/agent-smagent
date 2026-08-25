// this file contains the types and functions related to provider errors in the system.
// defines the structure of a provider error, including its type, provider, model, session, message, cause, retryable status, and timestamp.
// `providerError` function is a utility to create a new provider error object with the specified properties.
export type ProviderErrorType =
    | "transport"
    | "api"
    | "auth"
    | "rate_limit"
    | "model"
    | "timeout"
    | "content"
    | "internal";

export interface ProviderError {
    type: ProviderErrorType;
    provider: string;
    model: string;
    session: string;
    message: string;
    cause?: unknown;
    retryable: boolean;
    retryDelay?: number; // ms milliseconds before retrying
    retryCount?: number; // INT number of retries attempted
    timestamp: number;
    timeout?: boolean; // indicates if the error was due to a timeout
}

export function providerError(
    type: ProviderErrorType,
    provider: string,
    model: string,
    session: string,
    message: string,
    cause?: unknown,
    retryCount: number = 0,
    // retryable: boolean = false,
): ProviderError {
    return {
        type,
        provider,
        model,
        session,
        message,
        cause,
        retryable: classifyRetry(type),
        retryDelay: classifyRetry(type) ? 250 * (retryCount + 1) : undefined,
        retryCount,
        timestamp: Date.now(),
        timeout: type === "timeout",
    };
}

export function classifyRetry(type: ProviderErrorType): boolean {
    switch (type) {
        case "transport":
        case "rate_limit":
            return true;

        case "api":
        case "auth":
        case "model":
        case "content":
        case "internal":
        case "timeout":
            return false;

        default:
            return false;
    }
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 2,
): Promise<T> {
    let lastErr: any = null;
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr;
}

export function normalizeError(provider: string, err: unknown): ProviderError {
    if (err instanceof Error) {
        return providerError(
            "internal",
            provider,
            "unknown",
            "unknown",
            err.message,
            err,
        );
    } else if (typeof err === "string") {
        return providerError("internal", provider, "unknown", "unknown", err);
    } else {
        return providerError(
            "internal",
            provider,
            "unknown",
            "unknown",
            "Unknown error",
        );
    }
}

export function isProviderError(err: any): err is ProviderError {
    return err && typeof err === "object" && typeof err.type === "string";
}
