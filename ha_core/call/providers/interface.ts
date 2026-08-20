import type { SMAGEMessage } from "../../index.js";
// this file defines the interface for the provider adapter to call the provider's API.
export interface ProviderRequest {
    session: string;
    model: string;
    messages: SMAGEMessage[];
    options?: {
        provider?: string;
        temperature?: number;
        maxTokens?: number;
        retry?: number;
    };
}

export interface ProviderResponse {
    role: "assistant" | "tool";
    content: string;
    meta?: Record<string, any>;
}

export interface ProviderAdapter {
    name?: string;
    capabilities?: {
        streaming?: boolean;
        tools?: boolean;
        systemRole?: boolean;
        maxTokens?: number;
    };
    call(req: ProviderRequest): Promise<ProviderResponse>;
}
