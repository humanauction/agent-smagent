import { SMAGEOrchestrator } from "../../ha_wrap/orchestrator.js";
import { installFallbackMocks } from "../_setup/providerRegistry.js";

describe("SMAGEOrchestrator Fallback", () => {
    beforeEach(() => installFallbackMocks());

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

        expect(res.content).toContain("anthropic success");
    });
});
