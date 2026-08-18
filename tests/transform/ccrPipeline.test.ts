// Stage 3 test suite for CCRPipeline
import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import type { SMAGEMessage } from "../../ha_core/index.js";
import { describe, it, expect } from "vitest";

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
        expect(shaped.anchor.system).not.toBeNull();
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

// -----------------------
// baseline testing suite
// -----------------------

// baseline test: anchor extraction
test("CCR baseline: anchor extraction", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "system", content: "sys", meta: {} },
        { role: "user", content: "hello", meta: {} },
        { role: "assistant", content: "hi", meta: {} },
        { role: "tool", content: "tool-output", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});

    expect(shaped.anchor.system?.content).toBe("sys");
    expect(shaped.anchor.lastUser?.content).toBe("hello");
    expect(shaped.anchor.lastAssistant?.content).toBe("hi");
    expect(shaped.anchor.lastTool?.content).toBe("tool-output");
});

// test baseline: dedupe
test("CCR baseline: dedupe", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "hello", meta: {} },
        { role: "user", content: "hello", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});

    expect(shaped.deduped.length).toBe(1);
});

// test baseline: relevance scoring
test("CCR baseline: relevance scoring", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "important", meta: {} },
        { role: "user", content: "meh", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});

    expect(shaped.scored.length).toBe(2);
    expect(typeof shaped.scored[0]).toBe("number");
});
// test baseline: priority assignment
test("CCR baseline: priority assignment", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "urgent", meta: {} },
        { role: "user", content: "normal", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});

    expect(shaped.prioritized.length).toBe(2);
});

// test baseline: context window
test("CCR baseline: windowing", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = Array.from({ length: 50 }, (_, i) => ({
        role: "user",
        content: `msg ${i}`,
        meta: {},
    }));

    const shaped = await pipeline.run("test", messages, {});

    expect(shaped.windowed.length).toBeLessThanOrEqual(50);
});

// test baseline: Reconstruction
test("CCR baseline: reconstruction", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "system", content: "sys", meta: {} },
        { role: "user", content: "hello", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});

    expect(shaped.reconstructed.length).toBeGreaterThan(0);
});

// test baseline: compression
test("CCR baseline: compression", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "hello world", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});

    expect(shaped.compressed.length).toBeGreaterThan(0);
});

// test baseline: output reduction
test("CCR baseline: reduction", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "hello world", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});

    expect(shaped.reduced).toBeDefined();
    expect(typeof shaped.reduced.content).toBe("string");
});

// test baseline: full pipeline shape
test("CCR baseline: full pipeline shape", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "hello", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});

    expect(Object.keys(shaped)).toEqual([
        "original",
        "anchor",
        "deduped",
        "scored",
        "prioritized",
        "windowed",
        "reconstructed",
        "compressed",
        "reduced",
    ]);
});
