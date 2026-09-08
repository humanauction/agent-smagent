import { describe, it, expect } from "vitest";
import { SMAGEOrchestrator } from "../../ha_wrap/orchestrator.js";
import { mockConfig } from "../utils/mockConfig.js";
import { mockMessages } from "../utils/mockMessages.js";

describe("Orchestrator baselineFreeze", () => {
    it("produces identical results across runs", async () => {
        const orch1 = new SMAGEOrchestrator(mockConfig);
        const orch2 = new SMAGEOrchestrator(mockConfig);

        const res1 = await orch1.orchestrate(mockMessages);
        const res2 = await orch2.orchestrate(mockMessages);

        expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
    });
});
