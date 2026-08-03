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
    timestamp: number;
}

export function providerError(
    type: ProviderErrorType,
    provider: string,
    model: string,
    session: string,
    message: string,
    cause?: unknown,
    retryable: boolean = false,
): ProviderError {
    return {
        type,
        provider,
        model,
        session,
        message,
        cause,
        retryable,
        timestamp: Date.now(),
    };
}
