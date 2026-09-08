import { describe, it, expect } from "vitest";
import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import { mockMessages } from "../utils/mockMessages.js";
import { mockConfig } from "../utils/mockConfig.js";

describe("CCRPipeline baselineFreeze", () => {
    it("produces identical shaped output across runs", async () => {
        const telemetry = new ProviderChainTelemetry();
        const ccr = new CCRPipeline(telemetry);

        const agent = mockConfig.agents[0];
        if (!agent) {
            throw new Error("No agent found in mockConfig");
        }
        const options = {
            ...(agent.options ?? {}),
            provider: agent.provider,
            depth: agent.options?.depth ?? 0,
            cost: agent.options?.cost ?? 0,
            quality: agent.options?.quality ?? 0,
            reliability: 0.9,
        };

        const run1 = await ccr.run(mockConfig.session, mockMessages, options);
        const run2 = await ccr.run(mockConfig.session, mockMessages, options);

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
