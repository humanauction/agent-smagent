// this file contains the types and functions related to provider errors in the system.
// defines the structure of a provider error, including its type, provider, model, session, message, cause, retryable status, and timestamp.
// `providerError` function is a utility to create a new provider error object with the specified properties.
export type ProviderErrorType =
    | "transport"
    | "api"
    | "auth"
    | "rate_limit"
    | "model"
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
}

export function providerError(
    type: ProviderErrorType,
    provider: string,
    model: string,
    session: string,
    message: string,
    cause?: unknown,
    retryCount: number = 0,
    retryable: boolean = false,
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
            return false;
    }
}
