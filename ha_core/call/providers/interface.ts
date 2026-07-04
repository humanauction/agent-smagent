// this file defines the interface for the provider adapter to call the provider's API.
export interface ProviderRequest {
    model: string;
    messages: Array<{ role: string; content: string }>;
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
