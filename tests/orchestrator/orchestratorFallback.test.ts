import { SMAGEOrchestrator } from "../../ha_wrap/orchestrator.js";
import { providers } from "../../ha_core/call/providers/index.js";
import type {
    ProviderRequest,
    ProviderResponse,
} from "../../ha_core/call/providers/interface.js";

// Force primary provider to fail
providers["openai"] = {
    async call(req: ProviderRequest): Promise<ProviderResponse> {
        throw new Error("forced orchestrator failure");
    },
};

// Fallback provider succeeds
providers["anthropic"] = {
    async call(req: ProviderRequest): Promise<ProviderResponse> {
        return { role: "assistant", content: "fallback success" };
    },
};

describe("SMAGEOrchestrator Fallback", () => {
    it("uses fallback provider when primary fails", async () => {
        const orch = new SMAGEOrchestrator({
            session: "test-session",
            strategy: "auto",
            agents: [
                {
                    id: "agent1",
                    provider: "openai",
                    model: "gpt-4o-mini",
                    speed: 1,
                    cost: 1,
                    depth: 1,
                    quality: 1,
                    options: { fallback: "anthropic" },
                },
            ],
        });

        const res = await orch.orchestrate([
            { role: "user", content: "hello" },
        ]);

        expect(res.content).toBe("fallback success");
    });
});
