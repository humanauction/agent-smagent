import { describe, it, expect } from "vitest";
import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import { mockMessages } from "../utils/mockMessages.js";
import { mockConfig } from "../utils/mockConfig.js";
import { freezeDiff } from "../freeze/freezeDiff.js";

describe("CCRPipeline baselineFreeze", () => {
    it("produces identical shaped output across runs", async () => {
        const telemetry = new ProviderChainTelemetry();
        const ccr = new CCRPipeline(telemetry);

        const agent = mockConfig.agents[0];
        if (!agent) throw new Error("No agent found in mockConfig");

        const ccrOptions = {
            provider: agent.provider,
            depth: agent.depth ?? 0,
            cost: agent.cost ?? 0,
            quality: agent.quality ?? 0,
            reliability: 0.9,
            baselineFreeze: true,
        };

        const run1 = await ccr.run(
            mockConfig.session,
            mockMessages,
            ccrOptions,
        );
        const run2 = await ccr.run(
            mockConfig.session,
            mockMessages,
            ccrOptions,
        );

        expect(JSON.stringify(run1.windowed)).toBe(
            JSON.stringify(run2.windowed),
        );
        expect(JSON.stringify(run1.reconstructed)).toBe(
            JSON.stringify(run2.reconstructed),
        );
        expect(JSON.stringify(run1.compressed)).toBe(
            JSON.stringify(run2.compressed),
        );
        expect(JSON.stringify(run1.reduced)).toBe(JSON.stringify(run2.reduced));
    });
});

describe("CCR baselineFreeze regression", () => {
    it("matches baseline snapshot", async () => {
        const ccr = new CCRPipeline(new ProviderChainTelemetry());
        const agent = mockConfig.agents[0];
        if (!agent) throw new Error("No agent found in mockConfig");

        const ccrOptions = {
            provider: agent.provider,
            depth: agent.depth ?? 0,
            cost: agent.cost ?? 0,
            quality: agent.quality ?? 0,
            reliability: 0.9,
            baselineFreeze: true,
        };

        const out = await ccr.run(mockConfig.session, mockMessages, ccrOptions);
        freezeDiff("ccr", out);
    });
});
