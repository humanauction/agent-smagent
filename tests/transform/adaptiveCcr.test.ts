import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { describe, expect, it } from "vitest";
import { assignPriority } from "../../ha_core/transform/priority.js";
import { applyContextWindow } from "../../ha_core/transform/window.js";
import {
    adaptiveCcrFixtures,
    type AdaptiveCcrFixture,
} from "./adaptiveCcrFixtures.js";

interface AdaptiveResult {
    fixture: string;
    description: string;
    frozen: {
        tiers: number[];
        windowCount: number;
        tokens: number;
    };
    adaptive: {
        tiers: number[];
        windowCount: number;
        tokens: number;
    };
}

function evaluateFixture(fixture: AdaptiveCcrFixture): AdaptiveResult {
    const frozen = assignPriority(
        structuredClone(fixture.messages),
        fixture.anchor,
        { baselineFreeze: true },
    );
    const adaptive = assignPriority(
        structuredClone(fixture.messages),
        fixture.anchor,
        { baselineFreeze: false },
    );
    const frozenWindow = applyContextWindow(
        frozen,
        fixture.maxTokens,
        { baselineFreeze: true },
    );
    const adaptiveWindow = applyContextWindow(
        adaptive,
        fixture.maxTokens,
        { baselineFreeze: false },
    );

    return {
        fixture: fixture.id,
        description: fixture.description,
        frozen: {
            tiers: frozen.map((message) => Number(message.meta?.tier ?? 0)),
            windowCount: frozenWindow.windowed.length,
            tokens: frozenWindow.tokens,
        },
        adaptive: {
            tiers: adaptive.map((message) => Number(message.meta?.tier ?? 0)),
            windowCount: adaptiveWindow.windowed.length,
            tokens: adaptiveWindow.tokens,
        },
    };
}

describe("adaptive CCR fixtures", () => {
    it("measures provider- and intent-specific shaping separately from freeze mode", () => {
        const results = adaptiveCcrFixtures.map(evaluateFixture);

        expect(results[0]?.adaptive.tiers[0]).toBe(3);
        expect(results[0]?.frozen.tiers[0]).toBe(1);
        expect(results[1]?.adaptive.tiers[0]).toBe(3);
        expect(results[1]?.frozen.tiers[0]).toBe(1);
        expect(results[2]?.adaptive.tiers[0]).toBe(2);
        expect(results[2]?.frozen.tiers[0]).toBe(1);
        expect(results[3]?.adaptive.windowCount).toBeGreaterThan(
            results[3]?.frozen.windowCount ?? 0,
        );

        const outputPath = process.env.SMAGE_ADAPTIVE_OUTPUT;
        if (outputPath) {
            const file = isAbsolute(outputPath)
                ? outputPath
                : join(process.cwd(), outputPath);
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`, "utf8");
        }
    });
});
