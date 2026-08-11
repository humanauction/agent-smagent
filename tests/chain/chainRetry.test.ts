import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { providers } from "../../ha_core/call/providers/index.js";
import type {
    ProviderRequest,
    ProviderResponse,
} from "../../ha_core/call/providers/interface.js";

// Monkey-patch a provider to force retryable errors
providers["openai"] = {
    async call(req: ProviderRequest): Promise<ProviderResponse> {
        throw {
            type: "retryable",
            provider: "openai",
            model: req.model,
            session: req.session,
            message: "forced retry",
            retryable: true,
            retryCount: 0,
            retryDelay: 10,
        };
    },
};

providers["anthropic"] = {
    async call(req: ProviderRequest): Promise<ProviderResponse> {
        return {
            role: "assistant",
            content: "anthropic fallback success",
        };
    },
};

describe("ChainRouter Retry Logic", () => {
    it("retries a retryable provider and then falls through to next provider", async () => {
        const chain = new ProviderChainRouter(
            {
                metrics: {
                    openai: { speed: 1 },
                    anthropic: { speed: 0.5 },
                },
                weights: {
                    speed: 1,
                    cost: 0,
                    depth: 0,
                    quality: 0,
                    reliability: 0,
                },
            },
            "test-session",
        );

        const res = await chain.call({
            session: "test-session",
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "hello" }],
            options: {},
        });

        expect(res.content).toBe("anthropic fallback success");
    });
});
