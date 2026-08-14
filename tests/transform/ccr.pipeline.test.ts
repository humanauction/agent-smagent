// Stage 3 test suite for CCRPipeline
import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import type { SMAGEMessage } from "../../ha_core/index.js";

// this file contains the test suite for the CCRPipeline end-to-end processing of messages through all pipeline stages.

function msg(
    role: "system" | "user" | "assistant" | "tool",
    content: string,
): SMAGEMessage {
    return { role, content, meta: {} };
}

describe("CCRPipeline", () => {
    it("should process messages through all CCR pipeline stages", async () => {
        const telemetry = new ProviderChainTelemetry();
        const ccr = new CCRPipeline(telemetry);

        const messages: SMAGEMessage[] = [
            msg("system", "system A"),
            msg("user", "hello world"),
            msg("assistant", "response 1"),
            msg("assistant", "response 1"), // duplicate
            msg("tool", "TOOL_OUTPUT: lots of text ".repeat(50)),
        ];

        const shaped = await ccr.run("test-session", messages, {});

        // --- anchors ---
        expect(shaped.anchor.system.length).toBe(1);
        expect(shaped.anchor.lastUser?.content).toBe("hello world");
        expect(shaped.anchor.lastAssistant?.content).toBe("response 1");
        expect(shaped.anchor.lastTool?.role).toBe("tool");

        // --- dedupe ---
        expect(shaped.deduped.length).toBeLessThan(messages.length);
        expect(
            shaped.deduped.filter((m) => m.role === "assistant").length,
        ).toBe(1);

        // --- relevance scoring ---
        expect(shaped.scored.length).toBe(shaped.deduped.length);
        shaped.scored.forEach((score) => {
            expect(typeof score).toBe("number");
            expect(score).toBeGreaterThanOrEqual(0);
        });

        // --- priority assignment ---
        expect(shaped.prioritized.length).toBe(shaped.deduped.length);
        shaped.prioritized.forEach((m) => {
            expect(typeof m.meta?.priority).toBe("number");
        });

        // --- window shaping ---
        expect(shaped.windowed.length).toBeGreaterThan(0);
        const firstWindowed = shaped.windowed.at(0)!;
        expect(firstWindowed.role).toBe("system"); // anchor spine
        expect(shaped.windowed.some((m) => m.role === "assistant")).toBe(true);
        expect(shaped.windowed.some((m) => m.role === "tool")).toBe(true);

        // --- reconstruction ---
        expect(shaped.reconstructed.length).toBeGreaterThan(
            shaped.windowed.length,
        );
        const firstReconstructed = shaped.reconstructed.at(0)!;
        expect(firstReconstructed.role).toBe("system");
        expect(shaped.reconstructed.some((m) => m.role === "assistant")).toBe(
            true,
        );
        expect(shaped.reconstructed.some((m) => m.role === "tool")).toBe(true);

        // --- payload compression ---
        const toolMsg = shaped.compressed.find((m) => m.role === "tool");
        expect(toolMsg).toBeDefined();
        expect(toolMsg?.meta?.compressed).toBe(true);

        // --- output reduction ---
        expect(["assistant", "tool"]).toContain(shaped.reduced.role);
        expect(shaped.reduced.meta?.reduced).toBe(true);

        // --- baseline reduction check ---
        const rawTokens = messages.reduce(
            (sum, m) => sum + m.content.length,
            0,
        );
        const shapedTokens = shaped.compressed.reduce(
            (sum, m) => sum + m.content.length,
            0,
        );

        expect(shapedTokens).toBeLessThan(rawTokens);
    });
});
