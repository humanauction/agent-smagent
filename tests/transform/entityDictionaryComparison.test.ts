import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { estimateSchemaTokens } from "../../ha_core/transform/schemaFactoring.js";
import {
    factorRepeatedEntities,
    restoreRepeatedEntities,
} from "../../ha_core/transform/entityDictionary.js";
import { freezeCorpus } from "../freeze/freezeCorpus.js";
import { entityDictionaryFixtures } from "./entityDictionaryFixtures.js";

// this file tests the entity dictionary factoring and restoration logic in a full CCR pipeline context;
// compares control and opt-in paths, freeze control and freeze opt-in paths;
// ensures repeated title-cased multiword names are correctly factored into a dictionary, restored and required phrases retained.
async function runPath(
    caseId: string,
    mode: "control" | "optIn" | "freezeControl" | "freezeOptIn",
    messages: Parameters<CCRPipeline["run"]>[1],
) {
    const session = `entity-eval-${caseId}-${mode}`;
    const started = performance.now();
    const result = await new CCRPipeline(new ProviderChainTelemetry()).run(
        session,
        messages,
        {
            entityDictionary: mode === "optIn" || mode === "freezeOptIn",
            baselineFreeze: mode === "freezeControl" || mode === "freezeOptIn",
            maxTokens: 4096,
            maxPayloadChars: 20_000,
        },
    );
    const elapsedLocalMs =
        Math.round((performance.now() - started) * 100) / 100;
    const compressedText = result.compressed
        .map((message) => message.content)
        .join("\n");
    const [corpusCase] = freezeCorpus.filter((entry) => entry.id === caseId);
    const requiredPhrases = corpusCase?.mustRetain ?? [];
    const factored = result.compressed.filter(
        (message) => message.meta?.entityDictionaryFactored === true,
    );
    const exactRestores = factored.every((message) => {
        const reference = message.meta?.entityDictionaryReference;
        if (typeof reference !== "string") return false;
        const restored = restoreRepeatedEntities(
            message.content,
            session,
            reference,
        );
        return (
            restored !== null &&
            result.reconstructed.some((source) => source.content === restored)
        );
    });

    return {
        entityDictionaryFactoredMessageCount: factored.length,
        exactEntityRestores: exactRestores,
        inputLexicalTokenEstimate: messages.reduce(
            (total, message) =>
                total + estimateSchemaTokens(String(message.content)),
            0,
        ),
        compressedLexicalTokenEstimate: result.compressed.reduce(
            (total, message) =>
                total + estimateSchemaTokens(String(message.content)),
            0,
        ),
        requiredPhraseCount: requiredPhrases.length,
        requiredPhrasesRetained: requiredPhrases.filter((phrase) =>
            compressedText
                .toLocaleLowerCase()
                .includes(phrase.toLocaleLowerCase()),
        ),
        windowCount: result.windowed.length,
        reconstructionCount: result.reconstructed.length,
        compressedCount: result.compressed.length,
        elapsedLocalMs,
        compressed: result.compressed,
    };
}

describe("entity dictionary corpus comparison", () => {
    it("compares the full freeze corpus and preserves approved freeze output", async () => {
        const cases = [];
        for (const corpusCase of freezeCorpus) {
            const control = await runPath(
                corpusCase.id,
                "control",
                corpusCase.messages,
            );
            const optIn = await runPath(
                corpusCase.id,
                "optIn",
                corpusCase.messages,
            );
            const freezeControl = await runPath(
                corpusCase.id,
                "freezeControl",
                corpusCase.messages,
            );
            const freezeOptIn = await runPath(
                corpusCase.id,
                "freezeOptIn",
                corpusCase.messages,
            );
            expect(
                freezeOptIn.compressed,
                `${corpusCase.id}: baselineFreeze parity`,
            ).toEqual(freezeControl.compressed);
            expect(
                optIn.requiredPhrasesRetained,
                `${corpusCase.id}: phrase retention`,
            ).toEqual(control.requiredPhrasesRetained);
            expect(
                optIn.exactEntityRestores,
                `${corpusCase.id}: entity restore`,
            ).toBe(true);
            cases.push({
                id: corpusCase.id,
                category: corpusCase.category,
                control: { ...control, compressed: undefined },
                optIn: { ...optIn, compressed: undefined },
                freezeControl: { ...freezeControl, compressed: undefined },
                freezeOptIn: { ...freezeOptIn, compressed: undefined },
                freezeOutputEqual: true,
            });
        }

        const fixtureResults = entityDictionaryFixtures.map((fixture) => {
            const started = performance.now();
            const direct = runDirectEstimate(
                fixture.content,
                fixture.id,
                fixture.expectedToFactor,
                fixture.requiredPhrases ?? [],
            );
            return {
                id: fixture.id,
                category: fixture.category,
                ...direct,
                elapsedLocalMs:
                    Math.round((performance.now() - started) * 100) / 100,
            };
        });
        const allRuns = cases.flatMap((entry) => [
            entry.control,
            entry.optIn,
            entry.freezeControl,
            entry.freezeOptIn,
        ]);
        const report = {
            experiment: "entity-dictionary-exact-titlecase-v1",
            scope: "local deterministic CCR corpus paths and synthetic phrase fixtures; no provider calls",
            policy: "Replace repeated exact title-cased multiword spans only when the inline dictionary packet has positive estimated savings; packet references are session-bound.",
            tokenEstimator:
                "The same JSON lexical estimator used for schema factoring; heuristic only, not a provider tokenizer.",
            freezeCorpus: {
                caseCount: cases.length,
                pathCount: 4,
                cases,
                factoredMessages: allRuns.reduce(
                    (total, row) =>
                        total + row.entityDictionaryFactoredMessageCount,
                    0,
                ),
                requiredPhraseLosses: cases.reduce(
                    (total, row) =>
                        total +
                        row.control.requiredPhraseCount -
                        row.optIn.requiredPhrasesRetained.length,
                    0,
                ),
                freezeParityFailures: cases.filter(
                    (row) => !row.freezeOutputEqual,
                ).length,
                entityRestoreFailures: allRuns.filter(
                    (row) => !row.exactEntityRestores,
                ).length,
            },
            fixtures: {
                count: fixtureResults.length,
                entityHeavy: fixtureResults.filter(
                    (row) => row.category === "entity-heavy",
                ).length,
                projectHeavy: fixtureResults.filter(
                    (row) => row.category === "project-heavy",
                ).length,
                ordinary: fixtureResults.filter(
                    (row) => row.category === "ordinary",
                ).length,
                edge: fixtureResults.filter((row) => row.category === "edge")
                    .length,
                requiredPhraseLosses: fixtureResults.reduce(
                    (total, row) => total + row.requiredPhraseCount -
                        row.requiredPhrasesRetained.length,
                    0,
                ),
                results: fixtureResults,
            },
            runtime: {
                freezePathRunCount: allRuns.length,
                note: "Local elapsed times vary by run; timing is recorded for observation, not asserted.",
            },
            decision:
                "Keep opt-in only pending larger, naturally occurring entity-heavy data and provider-tokenizer validation.",
        };
        const reportPath = process.env.SMAGE_ENTITY_DICTIONARY_REPORT;
        if (reportPath)
            writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

        expect(cases).toHaveLength(8);
        expect(report.freezeCorpus.freezeParityFailures).toBe(0);
        expect(report.freezeCorpus.requiredPhraseLosses).toBe(0);
        expect(report.freezeCorpus.entityRestoreFailures).toBe(0);
        expect(report.fixtures.requiredPhraseLosses).toBe(0);
    });
});

function runDirectEstimate(
    content: string,
    session: string,
    expectedToFactor: boolean,
    requiredPhrases: string[],
) {
    const packet = factorRepeatedEntities(content, session);
    const restored = packet
        ? restoreRepeatedEntities(packet.content, session, packet.reference) ?? ""
        : content;
    return {
        factored: packet !== null,
        expectedToFactor,
        classification: packet
            ? "beneficial"
            : expectedToFactor
              ? "rejected-for-overhead"
              : "fallback",
        inputLexicalTokens: estimateSchemaTokens(content),
        packetLexicalTokens:
            packet?.estimatedTokensAfter ?? estimateSchemaTokens(content),
        estimatedTokensSaved: packet
            ? packet.estimatedTokensBefore - packet.estimatedTokensAfter
            : 0,
        entityCount: packet?.entityCount ?? 0,
        requiredPhraseCount: requiredPhrases.length,
        requiredPhrasesRetained: requiredPhrases.filter((phrase) =>
            restored.includes(phrase),
        ),
    };
}
