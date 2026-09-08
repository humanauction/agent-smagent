import type { OrchestratorConfig } from "../../ha_wrap/orchestrator.js";

export const mockConfig: OrchestratorConfig = {
    session: "test-session",
    strategy: "single",
    agents: [
        {
            id: "agent1",
            provider: "openai",
            model: "gpt-4o-mini",
            speed: 1.0,
            depth: 2,
            cost: 0.5,
            quality: 0.8,
            options: {
                baselineFreeze: true,
            },
        },
    ],
};
