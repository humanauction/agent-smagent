import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { providers } from "../../ha_core/call/providers/index.js";
import type {
    ProviderRequest,
    ProviderResponse,
} from "../../ha_core/call/providers/interface.js";

providers["openai"] = {
    async call(req: ProviderRequest): Promise<ProviderResponse> {
        throw new Error("forced failure");
    },
};

providers["anthropic"] = {
    async call(req: ProviderRequest): Promise<ProviderResponse> {
        return { role: "assistant", content: "anthropic success" };
    },
};

describe("ChainRouter Fallback to Next Provider", () => {
    it("falls through to next provider on failure", async () => {
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

        expect(res.content).toBe("anthropic success");
    });
});
