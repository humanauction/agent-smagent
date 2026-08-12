import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { providers } from "../../ha_core/call/providers/index.js";
import { installMockProviders } from "../_setup/providerRegistry.js";

describe("ChainRouter Multi-Provider Selection", () => {
    beforeEach(() => installMockProviders());

    it("selects correct provider when metrics differ", async () => {
        providers["google"] = {
            name: "google",
            async call() {
                return { role: "assistant", content: "[google] success" };
            },
        };

        const chain = new ProviderChainRouter(
            {
                metrics: {
                    openai: {
                        speed: 0.1,
                        cost: 0,
                        depth: 0,
                        quality: 0,
                        reliability: 0,
                    },
                    anthropic: {
                        speed: 0.2,
                        cost: 0,
                        depth: 0,
                        quality: 0,
                        reliability: 0,
                    },
                    google: {
                        speed: 0.3,
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

        expect(res.content).toContain("[google]");
    });
});
