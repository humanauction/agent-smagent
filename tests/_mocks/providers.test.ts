import type {
    ProviderAdapter,
    ProviderRequest,
    ProviderResponse,
} from "../../ha_core/call/providers/interface.js";

// ---------------------------------------------
// Utility
// ---------------------------------------------
export function mockResponse(content: string): ProviderResponse {
    return { role: "assistant", content };
}

// ---------------------------------------------
// Success provider
// ---------------------------------------------
export function mockSuccess(name: string, content?: string): ProviderAdapter {
    return {
        name,
        async call(): Promise<ProviderResponse> {
            return mockResponse(content ?? `[${name}] success`);
        },
    };
}

// ---------------------------------------------
// Forced failure provider
// ---------------------------------------------
export function mockFailure(name: string): ProviderAdapter {
    return {
        name,
        async call(): Promise<ProviderResponse> {
            throw new Error(`${name} forced failure`);
        },
    };
}

// ---------------------------------------------
// Forced retry provider
// ---------------------------------------------
export function mockRetry(name: string): ProviderAdapter {
    return {
        name,
        async call(req: ProviderRequest): Promise<ProviderResponse> {
            throw {
                type: "retryable",
                provider: name,
                model: req.model,
                session: req.session,
                message: `${name} forced retry`,
                retryable: true,
                retryCount: 0,
                retryDelay: 10,
            };
        },
    };
}

// ---------------------------------------------
// Forced fallback provider
// ---------------------------------------------
export function mockFallback(name: string): ProviderAdapter {
    return {
        name,
        async call(): Promise<ProviderResponse> {
            return mockResponse("fallback success");
        },
    };
}

// ---------------------------------------------
// Slow provider
// ---------------------------------------------
export function mockSlow(name: string, delayMs: number): ProviderAdapter {
    return {
        name,
        async call(): Promise<ProviderResponse> {
            await new Promise((r) => setTimeout(r, delayMs));
            return mockResponse(`[${name}] slow success`);
        },
    };
}
