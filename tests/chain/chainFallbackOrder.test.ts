import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { providers } from "../../ha_core/call/providers/index.js";
import { installFailureMocks } from "../_setup/providerRegistry.js";

describe("ChainRouter Fallback Ordering", () => {
    beforeEach(() => installFailureMocks());

    it("falls back in correct provider order", async () => {
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
                        speed: 0.9,
                        cost: 0,
                        depth: 0,
                        quality: 0,
                        reliability: 0,
                    },
                    google: {
                        speed: 0.8,
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

        providers["google"] = {
            name: "google",
            async call() {
                return { role: "assistant", content: "[google] success" };
            },
        };

        const res = await chain.call({
            session: "test-session",
            model: "gpt-4o-mini",
            provider: "chain",
            messages: [{ role: "user", content: "hello" }],
            options: {},
        });

        expect(res.content).toContain("[google]");
    });
});
