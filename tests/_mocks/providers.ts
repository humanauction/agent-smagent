import type {
    ProviderAdapter,
    ProviderRequest,
    ProviderResponse,
} from "../../ha_core/call/providers/interface.js";

// ---------------------------------------------
// Base mock response
// ---------------------------------------------
export function mockResponse(content: string): ProviderResponse {
    return {
        role: "assistant",
        content,
    };
}

// ---------------------------------------------
// Success provider
// ---------------------------------------------
export function mockSuccessProvider(name: string): ProviderAdapter {
    return {
        name,
        async call(req: ProviderRequest): Promise<ProviderResponse> {
            return mockResponse(`[${name}] success`);
        },
    };
}

// ---------------------------------------------
// Failure provider (non-retryable)
// ---------------------------------------------
export function mockFailureProvider(name: string): ProviderAdapter {
    return {
        name,
        async call(): Promise<ProviderResponse> {
            throw new Error(`[${name}] forced failure`);
        },
    };
}

// ---------------------------------------------
// Retryable provider
// ---------------------------------------------
export function mockRetryableProvider(name: string): ProviderAdapter {
    return {
        name,
        async call(req: ProviderRequest): Promise<ProviderResponse> {
            throw {
                type: "retryable",
                provider: name,
                model: req.model,
                session: req.session,
                message: `[${name}] forced retry`,
                retryable: true,
                retryCount: 0,
                retryDelay: 10,
            };
        },
    };
}

// ---------------------------------------------
// Slow provider (simulate latency)
// ---------------------------------------------
export function mockSlowProvider(
    name: string,
    delayMs: number,
): ProviderAdapter {
    return {
        name,
        async call(req: ProviderRequest): Promise<ProviderResponse> {
            await new Promise((r) => setTimeout(r, delayMs));
            return mockResponse(`[${name}] slow success`);
        },
    };
}

// ---------------------------------------------
// Deep provider (simulate high-quality output)
// ---------------------------------------------
export function mockDeepProvider(name: string): ProviderAdapter {
    return {
        name,
        async call(): Promise<ProviderResponse> {
            return mockResponse(`[${name}] deep reasoning output`);
        },
    };
}
