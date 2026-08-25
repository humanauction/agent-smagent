import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { providers } from "../../ha_core/call/providers/index.js";
import { installRetryMocks } from "../_setup/providerRegistry.js";

describe("ChainRouter Retry Loop", () => {
    beforeEach(() => installRetryMocks());

    it("retries retryable provider then falls back", async () => {
        const chain = new ProviderChainRouter(
            {
                metrics: {
                    openai: {
                        speed: 1,
                        cost: 0,
                        depth: 0,
                        quality: 0,
                        reliability: 0,
                    },
                    anthropic: {
                        speed: 0.5,
                        cost: 0,
                        depth: 0,
                        quality: 0,
                        reliability: 0,
                    },
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
            provider: "chain",
            messages: [{ role: "user", content: "hello" }],
            options: {},
        });

        expect(res.content).toContain("anthropic fallback success");
    });
});
