import type { ProviderResponse } from "./interface.js";

/**
 * Normalizes provider output into safe normalizeProviderResponse.
 * Guarantees:
 * - role is always "assistant"
 * - content is always a string
 * - never returns undefined
 */
export function normalizeProviderResponse(
    content: any,
    role?: ProviderResponse["role"],
): ProviderResponse {
    return {
        role: role ?? "assistant",
        content: typeof content === "string" ? content : String(content ?? ""),
    };
}
