import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { describe, expect, it } from "vitest";
import { tokenCount } from "../../ha_core/analyze/tokens.js";
import { applyContextWindow } from "../../ha_core/transform/window.js";
import {
    relevanceTierFixtures,
    type RelevanceTierFixture,
} from "./relevanceTierFixtures.js";

interface PolicyResult {
    tokens: number;
    selectedMessageIds: string[];
    retainedRequiredPhrases: string[];
    retainedHighPriorityMessages: number;
}

interface FixtureComparison {
    id: string;
    description: string;
    maxTokens: number;
    inputTokens: number;
    requiredPhraseCount: number;
    baseline: PolicyResult;
    relevanceFirst: PolicyResult;
}

function evaluate(
    fixture: RelevanceTierFixture,
    tierPolicy: "baseline" | "relevanceFirst",
): PolicyResult {
    const result = applyContextWindow(
        structuredClone(fixture.messages),
        fixture.maxTokens,
        { baselineFreeze: false, tierPolicy },
    );
    const text = result.windowed
        .map((message) => String(message.content))
        .join("\n")
        .toLocaleLowerCase();

    return {
        tokens: result.tokens,
        selectedMessageIds: result.windowed.map((message) =>
            String(message.meta?.fixtureMessageId ?? "<unlabeled>"),
        ),
        retainedRequiredPhrases: fixture.requiredPhrases.filter((phrase) =>
            text.includes(phrase.toLocaleLowerCase()),
        ),
        retainedHighPriorityMessages: result.windowed.filter(
            (message) => Number(message.meta?.priority ?? 0) >= 3,
        ).length,
    };
}

function compareFixture(fixture: RelevanceTierFixture): FixtureComparison {
    const baseline = evaluate(fixture, "baseline");
    const relevanceFirst = evaluate(fixture, "relevanceFirst");
    return {
        id: fixture.id,
        description: fixture.description,
        maxTokens: fixture.maxTokens,
        inputTokens: fixture.messages.reduce(
            (total, message) => total + tokenCount(String(message.content)),
            0,
        ),
        requiredPhraseCount: fixture.requiredPhrases.length,
        baseline,
        relevanceFirst,
    };
}

describe("opt-in relevance-tier long-history comparison", () => {
    it.skipIf(process.env.SMAGE_RUN_RELEVANCE_TIER_EXPERIMENT !== "1")(
        "compares baseline and relevanceFirst policies on labeled histories",
        () => {
            const results = relevanceTierFixtures.map(compareFixture);

            for (const fixture of relevanceTierFixtures) {
                const comparison = results.find((item) => item.id === fixture.id);
                expect(comparison).toBeDefined();
                expect(comparison?.baseline.tokens).toBeLessThanOrEqual(
                    fixture.maxTokens,
                );
                expect(comparison?.relevanceFirst.tokens).toBeLessThanOrEqual(
                    fixture.maxTokens,
                );
                expect(evaluate(fixture, "baseline")).toEqual(
                    comparison?.baseline,
                );
                expect(evaluate(fixture, "relevanceFirst")).toEqual(
                    comparison?.relevanceFirst,
                );
            }

            expect(results[0]?.baseline.retainedRequiredPhrases).toEqual([]);
            expect(results[0]?.relevanceFirst.retainedRequiredPhrases).toEqual([
                "Launch Cedar",
            ]);
            expect(results[1]?.baseline.retainedRequiredPhrases).toEqual([]);
            expect(results[1]?.relevanceFirst.retainedRequiredPhrases).toEqual([
                "Window Friday",
                "Owner Maya",
            ]);
            expect(results[2]?.baseline).toEqual(results[2]?.relevanceFirst);

            const outputPath =
                process.env.SMAGE_RELEVANCE_TIER_OUTPUT ??
                "docs/benchmarks/relevance_tier_comparison.json";
            const file = isAbsolute(outputPath)
                ? outputPath
                : join(process.cwd(), outputPath);
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(
                file,
                `${JSON.stringify(
                    {
                        experiment: "relevance-tier-long-history-v1",
                        scope: "offline deterministic window-selection comparison; no provider calls",
                        policy: "baseline versus opt-in relevanceFirst",
                        fixtures: results,
                    },
                    null,
                    2,
                )}\n`,
                "utf8",
            );

            console.log(
                results.map((result) => ({
                    fixture: result.id,
                    baselineTokens: result.baseline.tokens,
                    relevanceFirstTokens: result.relevanceFirst.tokens,
                    baselineRetained: result.baseline.retainedRequiredPhrases.length,
                    relevanceFirstRetained:
                        result.relevanceFirst.retainedRequiredPhrases.length,
                    required: result.requiredPhraseCount,
                })),
            );
        },
    );
});
