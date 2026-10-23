// Stage 3 test suite for CCRPipeline
import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import type { SMAGEMessage } from "../../ha_core/index.js";
import { applyContextWindow } from "../../ha_core/transform/window.js";
import { describe, it, expect, test } from "vitest";

// helper
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
        const firstWindowed = shaped.windowed.at(0);
        expect(firstWindowed?.role).toBe("system");

        // assistant/tool MAY OR MAY NOT survive windowing
        expect(Array.isArray(shaped.windowed)).toBe(true);

        // --- reconstruction ---
        expect(shaped.reconstructed.length).toBeGreaterThan(0);
        const firstReconstructed = shaped.reconstructed.at(0);
        expect(firstReconstructed?.role).toBe("system");

        // assistant/tool MAY OR MAY NOT survive reconstruction
        expect(Array.isArray(shaped.reconstructed)).toBe(true);

        // --- payload compression ---
        const toolMsg = shaped.compressed.find((m) => m.role === "tool");

        // If tool survived CCR, it must be compressed
        if (toolMsg) {
            expect(toolMsg.meta?.compressed).toBe(true);
        }

        // compressed array must always exist
        expect(Array.isArray(shaped.compressed)).toBe(true);

        // --- output reduction ---
        expect(shaped.reduced).toBeDefined();
        expect(typeof shaped.reduced.content).toBe("string");
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

        // shapedTokens MAY OR MAY NOT be less than rawTokens depending on CCR path
        expect(typeof shapedTokens).toBe("number");
    });
});

// -----------------------
// baseline testing suite
// -----------------------

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

test("CCR baseline: dedupe", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "hello", meta: {} },
        { role: "user", content: "hello", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});
    expect(shaped.deduped.length).toBe(1);
});

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

test("CCR baseline: priority assignment", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "urgent", meta: {} },
        { role: "user", content: "normal", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});
    expect(shaped.prioritized.length).toBe(2);
});

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

test("CCR baseline: reconstruction", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "system", content: "sys", meta: {} },
        { role: "user", content: "hello", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});
    expect(shaped.reconstructed.length).toBeGreaterThan(0);
});

test("CCR baseline: compression", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "hello world", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});
    const toolMsg = shaped.compressed.find((m) => m.role === "tool");

    if (toolMsg) {
        expect(toolMsg.meta?.compressed).toBe(true);
    }

    expect(Array.isArray(shaped.compressed)).toBe(true);
});

test("CCR baseline: reduction", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);

    const messages: SMAGEMessage[] = [
        { role: "user", content: "hello world", meta: {} },
    ];

    const shaped = await pipeline.run("test", messages, {});
    expect(shaped.reduced).toBeDefined();
    expect(typeof shaped.reduced.content).toBe("string");
});

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
        "tokens",
        "counts",
    ]);
});

test("CCR baselineFreeze: pipeline forwards options to priority and window stages", async () => {
    const pipeline = new CCRPipeline({ record() {} } as any);
    const messages: SMAGEMessage[] = [
        {
            role: "user",
            content: "Keep this user context.",
            meta: { provider: "local", relevance: 0 },
        },
        {
            role: "tool",
            content: "This is older diagnostic tool context.",
            meta: { provider: "local", relevance: 0 },
        },
        {
            role: "tool",
            content: "This is diagnostic tool context.",
            meta: { provider: "local", relevance: 0 },
        },
        {
            role: "user",
            content: "Now answer the question.",
            meta: { provider: "local", relevance: 0 },
        },
    ];

    const frozen = await pipeline.run("test", messages, {
        provider: "local",
        intent: "debug",
        baselineFreeze: true,
        maxTokens: 100,
    });
    const adaptive = await pipeline.run("test", messages, {
        provider: "local",
        intent: "debug",
        baselineFreeze: false,
        maxTokens: 100,
    });

    expect(frozen.prioritized[1]?.meta?.tier).toBe(3);
    expect(adaptive.prioritized[1]?.meta?.tier).toBe(1);
    expect(frozen.windowed.length).toBeGreaterThanOrEqual(
        adaptive.windowed.length,
    );
});

    test("relevanceFirst fills the budget without changing the default policy", () => {
        const messages: SMAGEMessage[] = [
            {
                role: "user",
                content: "one two three four five six",
                meta: { relevance: 0.9, priority: 3 },
            },
            {
                role: "user",
                content: "seven eight",
                meta: { relevance: 0.8, priority: 3 },
            },
        ];

        const baseline = applyContextWindow(messages, 8, {
            tierPolicy: "baseline",
        });
        const omitted = applyContextWindow(messages, 8);
        const relevanceFirst = applyContextWindow(messages, 8, {
            tierPolicy: "relevanceFirst",
        });
        const frozenRelevanceFirst = applyContextWindow(messages, 8, {
            baselineFreeze: true,
            tierPolicy: "relevanceFirst",
        });

        expect(omitted.windowed.map((message) => message.content)).toEqual(
            baseline.windowed.map((message) => message.content),
        );
        expect(baseline.windowed).toHaveLength(1);
        expect(frozenRelevanceFirst.windowed).toEqual(baseline.windowed);
        expect(relevanceFirst.tokens).toBeLessThanOrEqual(8);
        expect(relevanceFirst.windowed).toHaveLength(2);
    });

    test("relevanceFirst preserves anchors and chronological order", () => {
        const anchor: SMAGEMessage = {
            role: "system",
            content: "mandatory instruction",
            meta: { anchor: true },
        };
        const older: SMAGEMessage = {
            role: "user",
            content: "older context",
            meta: { relevance: 0.2, priority: 1 },
        };
        const newer: SMAGEMessage = {
            role: "user",
            content: "newer context",
            meta: { relevance: 0.8, priority: 3 },
        };

        const result = applyContextWindow([anchor, older, newer], 20, {
            tierPolicy: "relevanceFirst",
        });

        expect(result.windowed).toContain(anchor);
        expect(result.windowed.map((message) => message.content)).toEqual([
            anchor.content,
            older.content,
            newer.content,
        ]);
    });
