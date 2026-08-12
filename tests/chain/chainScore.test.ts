import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { providers } from "../../ha_core/call/providers/index.js";
import { installMockProviders } from "../_setup/providerRegistry.js";

describe("ChainRouter Scoring", () => {
    beforeEach(() => installMockProviders());

    it("selects provider with highest weighted score", async () => {
        const chain = new ProviderChainRouter(
            {
                metrics: {
                    openai: {
                        speed: 1,
                        cost: 1,
                        depth: 1,
                        quality: 1,
                        reliability: 1,
                    },
                    anthropic: {
                        speed: 0.1,
                        cost: 0.1,
                        depth: 0.1,
                        quality: 0.1,
                        reliability: 0.1,
                    },
                },
                weights: {
                    speed: 1,
                    cost: 1,
                    depth: 1,
                    quality: 1,
                    reliability: 1,
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

        expect(res.content).toContain("[openai]");
    });
});
