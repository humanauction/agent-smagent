import type { SMAGEMessage } from "../../index";
// this file defines the interface for the provider adapter to call the provider's API.
export interface ProviderRequest {
    session: string;
    model: string;
    messages: SMAGEMessage[];
    options?: Record<string, any>;
}

export interface ProviderResponse {
    role: string;
    content: string;
}

export interface ProviderAdapter {
    name: string;
    call(req: ProviderRequest): Promise<ProviderResponse>;
}
