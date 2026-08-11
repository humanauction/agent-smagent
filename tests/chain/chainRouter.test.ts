import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";

describe("ProviderChainRouter", () => {
    it("routes to highest-score provider", async () => {
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

        expect(res.role).toBe("assistant");
        expect(typeof res.content).toBe("string");
    });
});
