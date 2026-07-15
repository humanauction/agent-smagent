import type { SMAGEMessage } from "../../index.js";

// this file defines utility functions for provider adapters

export function mapProviderRole(role: string): SMAGEMessage["role"] {
    switch (role) {
        case "system":
        case "user":
        case "assistant":
        case "tool":
            return role;

        case "model":
        case "assistant_model":
            return "assistant";

        case "developer":
        case "system_instruction":
            return "system";

        default:
            return "user";
    }
}
