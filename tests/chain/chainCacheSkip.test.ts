import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { providers } from "../../ha_core/call/providers/index.js";
import { installMockProviders } from "../_setup/providerRegistry.js";

describe("ChainRouter Cache Skip", () => {
    beforeEach(() => installMockProviders());

    it("skips providers marked as failed in cache", async () => {
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

        chain["cache"].markFailure("openai", "forced failure");

        const res = await chain.call({
            session: "test-session",
            model: "gpt-4o-mini",
            provider: "chain",
            messages: [{ role: "user", content: "hello" }],
            options: {},
        });

        expect(res.content).toContain("[anthropic]");
    });
});
