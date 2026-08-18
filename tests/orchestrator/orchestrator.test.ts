import { SMAGEOrchestrator } from "../../ha_wrap/orchestrator.js";
import { describe, it, expect } from "vitest";

describe("SMAGEOrchestrator", () => {
    it("AUTO strategy calls an agent", async () => {
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
                },
            ],
        });

        const res = await orch.orchestrate([
            { role: "user", content: "hello" },
        ]);

        expect(res.role).toBe("assistant");
        expect(typeof res.content).toBe("string");
    });
});
