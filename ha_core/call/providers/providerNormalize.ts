import type { ProviderResponse } from "./interface.js";

/**
 * Normalizes provider output into safe normalizeProviderResponse.
 * Guarantees:
 * - role is always "assistant"
 * - content is always a string
 * - never returns undefined
 */
export function normalizeProviderResponse(
    content: unknown,
    role: ProviderResponse["role"] = "assistant",
): ProviderResponse {
    return {
        content: typeof content === "string" ? content : String(content ?? ""),
        role,
    };
}
