import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { installFallbackMocks } from "../_setup/providerRegistry.js";

describe("ChainRouter Fallback to Next Provider", () => {
    beforeEach(() => installFallbackMocks());

    it("falls through to next provider on failure", async () => {
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
            messages: [{ role: "user", content: "hello" }],
            options: {},
        });

        expect(res.content).toContain("anthropic success");
    });
});
