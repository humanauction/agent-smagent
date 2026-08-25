import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";

describe("ChainTelemetry", () => {
    it("records scoring + call events", async () => {
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

        await chain.call({
            session: "test-session",
            model: "gpt-4o-mini",
            provider: "chain",
            messages: [{ role: "user", content: "hello" }],
            options: {},
        });

        const events = chain.getTelemetry();
        expect(events.length).toBeGreaterThan(0);

        const stages = events.map((e) => e.stage);
        expect(stages).toContain("scoring");
        expect(stages).toContain("call");
    });
});
