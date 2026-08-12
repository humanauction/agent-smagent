import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { installMockProviders } from "../_setup/providerRegistry.js";

describe("ChainRouter Telemetry", () => {
    beforeEach(() => installMockProviders());

    it("records scoring, selection, call, and normalization events", async () => {
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

        await chain.call({
            session: "test-session",
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "hello" }],
            options: {},
        });

        const events = chain.getTelemetry();

        expect(events.map((e) => e.stage)).toContain("scoring");
        expect(events.map((e) => e.stage)).toContain("selection");
        expect(events.map((e) => e.stage)).toContain("call");
        expect(events.map((e) => e.stage)).toContain("normalize");
    });
});
