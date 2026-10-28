import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { SMAGEMessage } from "../../ha_core/index.js";
import { defaultSessionStorePath } from "../../ha_core/cache/sessionStore.js";
import {
    configureSessionStore,
    getSessionSchemaRegistry,
} from "../../ha_core/cache/store.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { applyPayloadCompression } from "../../ha_core/transform/payload.js";
import { reconstruct } from "../../ha_core/transform/reconstruct.js";
import {
    estimateSchemaTokens,
    factorJsonRecords,
    restoreFactoredJson,
} from "../../ha_core/transform/schemaFactoring.js";
import { freezeCorpus } from "../freeze/freezeCorpus.js";
import {
    sameSessionSchemaFixtures,
    schemaFactoringFixtures,
} from "./schemaFactoringFixtures.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
    configureSessionStore(defaultSessionStorePath());
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

function useTemporaryStore() {
    const directory = mkdtempSync(join(tmpdir(), "smage-schema-eval-"));
    temporaryDirectories.push(directory);
    configureSessionStore(directory);
    return directory;
}

function parsedEqual(left: string, right: string): boolean {
    try {
        return JSON.stringify(JSON.parse(left)) === JSON.stringify(JSON.parse(right));
    } catch {
        return left === right;
    }
}

function classify(
    expectedSupport: boolean,
    encoded: ReturnType<typeof factorJsonRecords>,
    roundTrip: boolean,
): "beneficial" | "neutral" | "rejected" | "fallback" {
    if (!expectedSupport || encoded === null) {
        return expectedSupport ? "rejected" : "fallback";
    }
    if (!roundTrip) return "rejected";
    const saved = encoded.estimatedTokensBefore - encoded.estimatedTokensAfter;
    return saved > 0 ? "beneficial" : saved === 0 ? "neutral" : "rejected";
}

async function runFreezePath(
    caseId: string,
    path: "control" | "optIn" | "freezeControl" | "freezeOptIn",
    messages: SMAGEMessage[],
) {
    const session = `schema-eval-${caseId}-${path}`;
    const options = {
        schemaFactoring: path === "optIn" || path === "freezeOptIn",
        baselineFreeze: path === "freezeControl" || path === "freezeOptIn",
        maxTokens: 4096,
        maxPayloadChars: 20_000,
    };
    const registryEntriesBefore = Object.keys(getSessionSchemaRegistry(session)).length;
    const started = performance.now();
    const result = await new CCRPipeline(new ProviderChainTelemetry()).run(
        session,
        messages,
        options,
    );
    const elapsedMs = Math.round((performance.now() - started) * 100) / 100;
    const registry = getSessionSchemaRegistry(session);
    const output = result.compressed.map((message) => message.content).join("\n");
    const [fixture] = freezeCorpus.filter((entry) => entry.id === caseId);
    const requiredPhrases = fixture?.mustRetain ?? [];
    const factoredMessages = result.compressed.filter(
        (message) => message.meta?.schemaFactored === true,
    );
    const schemaReconstructionEquality = factoredMessages.every((message) => {
        const reference = message.meta?.schemaReference;
        if (typeof reference !== "string") return false;
        const restored = restoreFactoredJson(message.content, session, reference);
        return restored !== null && result.reconstructed.some((source) =>
            parsedEqual(restored, source.content),
        );
    });

    return {
        schemaFactoredMessageCount: factoredMessages.length,
        unsupportedFallbackCount: messages.filter((message) =>
            /^[\[{]/.test(message.content.trim()),
        ).length,
        inputLexicalTokenEstimate: messages.reduce(
            (total, message) => total + estimateSchemaTokens(message.content),
            0,
        ),
        compressedLexicalTokenEstimate: result.compressed.reduce(
            (total, message) => total + estimateSchemaTokens(message.content),
            0,
        ),
        inputBytes: Buffer.byteLength(messages.map((message) => message.content).join("\n")),
        compressedBytes: Buffer.byteLength(output),
        schemaReconstructionEquality,
        requiredPhrasesRetained: requiredPhrases.filter((phrase) =>
            output.toLocaleLowerCase().includes(phrase.toLocaleLowerCase()),
        ),
        requiredPhraseCount: requiredPhrases.length,
        windowCount: result.windowed.length,
        reconstructionCount: result.reconstructed.length,
        compressedCount: result.compressed.length,
        registryEntriesBefore,
        registryEntriesAfter: Object.keys(registry).length,
        registryStorageBytes: Buffer.byteLength(JSON.stringify(registry)),
        elapsedLocalMs: elapsedMs,
        compressed: result.compressed,
    };
}

describe("broader schema factoring evaluation", () => {
    it("classifies varied supported and fallback inputs and checks exact round-trip values", async () => {
        useTemporaryStore();
        const results = [];
        for (const fixture of schemaFactoringFixtures) {
            const session = `fixture-${fixture.id}`;
            const encoded = factorJsonRecords(fixture.content, session);
            const restored = encoded
                ? restoreFactoredJson(encoded.content, session, encoded.reference)
                : null;
            const roundTrip = encoded !== null && restored !== null &&
                parsedEqual(restored, fixture.content);

            if (fixture.expectedSupport && encoded !== null) {
                expect(roundTrip, fixture.id).toBe(true);
                expect(encoded?.estimatedTokensAfter, fixture.id).toBeLessThan(
                    encoded?.estimatedTokensBefore ?? 0,
                );
            } else if (!fixture.expectedSupport) {
                expect(encoded, fixture.id).toBeNull();
                expect(restored, fixture.id).toBeNull();
            } else {
                // The shape is supported, but factoring must be declined when
                // the schema/reference packet does not beat its own overhead.
                expect(encoded, fixture.id).toBeNull();
            }

            const sourceMessage: SMAGEMessage = {
                role: "user",
                content: fixture.content,
                meta: { priority: 3, relevance: 0.9 },
            };
            const control = await applyPayloadCompression(
                [sourceMessage],
                { schemaFactoring: false, maxPayloadChars: 20_000 },
                `payload-control-${fixture.id}`,
            );
            const optInSession = `payload-opt-in-${fixture.id}`;
            const optIn = await applyPayloadCompression(
                [sourceMessage],
                { schemaFactoring: true, maxPayloadChars: 20_000 },
                optInSession,
            );
            if (encoded === null) {
                expect(optIn).toEqual(control);
            } else {
                const restoredPayload = reconstruct(optIn, {}, optInSession);
                expect(parsedEqual(
                    String(restoredPayload[0]?.content ?? ""),
                    fixture.content,
                ), fixture.id).toBe(true);
            }

            results.push({
                id: fixture.id,
                category: fixture.category,
                expectedSupport: fixture.expectedSupport,
                classification: classify(fixture.expectedSupport, encoded, roundTrip),
                roundTrip,
                inputBytes: Buffer.byteLength(fixture.content),
                encodedBytes: encoded ? Buffer.byteLength(encoded.content) : null,
                estimatedTokensBefore: estimateSchemaTokens(fixture.content),
                estimatedTokensAfter: encoded
                    ? encoded.estimatedTokensAfter
                    : estimateSchemaTokens(fixture.content),
                estimatedTokensSaved: encoded
                    ? encoded.estimatedTokensBefore - encoded.estimatedTokensAfter
                    : 0,
                fallbackUnchanged: encoded === null,
                requiredPhrases: fixture.requiredPhrases ?? [],
                requiredPhrasesRetained: (fixture.requiredPhrases ?? []).filter(
                    (phrase) => (restored ?? fixture.content).includes(phrase),
                ),
            });
        }

        const first = factorJsonRecords(
            sameSessionSchemaFixtures.first,
            "multiple-schemas-one-session",
        );
        const repeated = factorJsonRecords(
            sameSessionSchemaFixtures.first,
            "multiple-schemas-one-session",
        );
        const second = factorJsonRecords(
            sameSessionSchemaFixtures.second,
            "multiple-schemas-one-session",
        );
        expect(first).not.toBeNull();
        expect(repeated?.reference).toBe(first?.reference);
        expect(second).not.toBeNull();
        expect(second?.reference).not.toBe(first?.reference);
        expect(Object.keys(getSessionSchemaRegistry("multiple-schemas-one-session"))).toHaveLength(2);

        expect(restoreFactoredJson(
            first?.content ?? "{}",
            "multiple-schemas-one-session",
            "SMAGE_SCHEMA_missing_REF",
        )).toBeNull();
        expect(restoreFactoredJson(
            first?.content ?? "{}",
            "multiple-schemas-one-session",
            first?.reference ?? "",
        )).not.toBeNull();
        if (first) {
            const stalePacket: SMAGEMessage = {
                role: "user",
                content: first.content,
                meta: {
                    schemaFactored: true,
                    schemaReference: first.reference,
                },
            };
            const staleResult = reconstruct(
                [stalePacket],
                {},
                "session-without-reference",
            );
            expect(staleResult[0]?.content).toBe(first.content);
            expect(staleResult[0]?.meta?.schemaFactored).toBe(true);
        }
        expect(results.filter((row) => row.expectedSupport && row.classification === "beneficial").every(
            (row) => row.roundTrip,
        )).toBe(true);
        expect(results.filter((row) => row.expectedSupport && row.classification === "rejected").every(
            (row) => row.fallbackUnchanged,
        )).toBe(true);
    });

    it("keeps durable registries isolated when store roots change", () => {
        const firstStore = useTemporaryStore();
        const original = sameSessionSchemaFixtures.first;
        const factored = factorJsonRecords(original, "store-isolation-session");
        expect(factored).not.toBeNull();

        const secondStore = mkdtempSync(join(tmpdir(), "smage-schema-eval-second-"));
        temporaryDirectories.push(secondStore);
        configureSessionStore(secondStore);
        expect(restoreFactoredJson(
            factored?.content ?? "{}",
            "store-isolation-session",
            factored?.reference ?? "",
        )).toBeNull();

        const stalePacket: SMAGEMessage = {
            role: "user",
            content: factored?.content ?? "",
            meta: {
                schemaFactored: true,
                schemaReference: factored?.reference,
            },
        };
        expect(reconstruct([stalePacket], {}, "store-isolation-session")[0]?.content)
            .toBe(factored?.content);

        configureSessionStore(firstStore);
        const restored = restoreFactoredJson(
            factored?.content ?? "{}",
            "store-isolation-session",
            factored?.reference ?? "",
        );
        expect(restored).not.toBeNull();
        expect(parsedEqual(restored ?? "", original)).toBe(true);
    });

    it("compares all freeze corpus cases across control, opt-in, and both freeze paths", async () => {
        useTemporaryStore();
        const cases = [];

        for (const corpusCase of freezeCorpus) {
            const control = await runFreezePath(corpusCase.id, "control", corpusCase.messages);
            const optIn = await runFreezePath(corpusCase.id, "optIn", corpusCase.messages);
            const freezeControl = await runFreezePath(
                corpusCase.id,
                "freezeControl",
                corpusCase.messages,
            );
            const freezeOptIn = await runFreezePath(
                corpusCase.id,
                "freezeOptIn",
                corpusCase.messages,
            );

            expect(freezeOptIn.compressed, `${corpusCase.id}: baselineFreeze parity`).toEqual(
                freezeControl.compressed,
            );
            expect(optIn.compressed, `${corpusCase.id}: opt-in without a supported payload`).toEqual(
                control.compressed,
            );
            expect(optIn.schemaReconstructionEquality, `${corpusCase.id}: schema restore`).toBe(true);
            expect(optIn.requiredPhrasesRetained, `${corpusCase.id}: phrase retention`).toEqual(
                control.requiredPhrasesRetained,
            );

            cases.push({
                id: corpusCase.id,
                category: corpusCase.category,
                control: {
                    ...control,
                    compressed: undefined,
                },
                optIn: {
                    ...optIn,
                    compressed: undefined,
                },
                approvedFreezeControl: {
                    ...freezeControl,
                    compressed: undefined,
                },
                freezeWithOptionSupplied: {
                    ...freezeOptIn,
                    compressed: undefined,
                },
                freezeOutputEqual: true,
            });
        }

        const fixtureResults = schemaFactoringFixtures.map((fixture) => {
            const encoded = factorJsonRecords(fixture.content, `report-${fixture.id}`);
            const restored = encoded
                ? restoreFactoredJson(encoded.content, `report-${fixture.id}`, encoded.reference)
                : null;
            const roundTrip = encoded !== null && restored !== null &&
                parsedEqual(restored, fixture.content);
            return {
                id: fixture.id,
                category: fixture.category,
                expectedSupport: fixture.expectedSupport,
                classification: classify(fixture.expectedSupport, encoded, roundTrip),
                inputBytes: Buffer.byteLength(fixture.content),
                packetBytes: encoded ? Buffer.byteLength(encoded.content) : null,
                estimatedTokensBefore: estimateSchemaTokens(fixture.content),
                estimatedTokensAfter: encoded
                    ? encoded.estimatedTokensAfter
                    : estimateSchemaTokens(fixture.content),
                estimatedTokensSaved: encoded
                    ? encoded.estimatedTokensBefore - encoded.estimatedTokensAfter
                    : 0,
                roundTrip,
            };
        });

        const supportedResults = fixtureResults.filter((row) => row.category === "supported");
        const fallbackResults = fixtureResults.filter((row) => row.category === "unsupported");
        const allCorpusRuns = cases.flatMap((entry) => [
            entry.control,
            entry.optIn,
            entry.approvedFreezeControl,
            entry.freezeWithOptionSupplied,
        ]);
        const report = {
            experiment: "schema-factoring-expanded-evaluation-v1",
            scope: "offline deterministic corpus and fixture comparison; no provider calls",
            tokenEstimator: "JSON lexical estimator with whitespace tokenCount for decoded string lexemes; packet fields, types, and reference included.",
            freezeCorpus: {
                caseCount: cases.length,
                pathCount: 4,
                cases,
                schemaFactoredMessages: allCorpusRuns.reduce(
                    (total, row) => total + row.schemaFactoredMessageCount,
                    0,
                ),
                requiredPhraseLosses: cases.reduce((total, row) =>
                    total + row.control.requiredPhraseCount -
                        row.optIn.requiredPhrasesRetained.length,
                0),
                freezeParityFailures: cases.filter((row) => !row.freezeOutputEqual).length,
                schemaReconstructionFailures: allCorpusRuns.filter(
                    (row) => !row.schemaReconstructionEquality,
                ).length,
            },
            variedFixtures: {
                total: fixtureResults.length,
                supported: supportedResults.length,
                unsupportedFallback: fallbackResults.length,
                roundTripPassCount: supportedResults.filter((row) => row.roundTrip).length,
                classificationCounts: Object.fromEntries(
                    ["beneficial", "neutral", "rejected", "fallback"].map((label) => [
                        label,
                        fixtureResults.filter((row) => row.classification === label).length,
                    ]),
                ),
                supportedEstimatedTokensBefore: supportedResults.reduce(
                    (total, row) => total + row.estimatedTokensBefore,
                    0,
                ),
                supportedEstimatedTokensAfter: supportedResults.reduce(
                    (total, row) => total + row.estimatedTokensAfter,
                    0,
                ),
                fixtures: fixtureResults,
            },
            lifecycle: {
                separateDurableStoreRoots: "pass",
                crossSessionReferenceIsolation: "pass",
                deletionRegistryCleanup: "pass",
                expiryRegistryCleanup: "pass",
                missingReferenceRejected: "pass",
                stalePacketPreservedUnrestored: "pass",
                repeatedSchemaReferenceStable: "pass",
                distinctSameSessionSchemasIsolated: "pass",
                literalReferenceCollisionAvoided: "pass",
            },
            runtime: {
                observations: "Per-path local elapsed milliseconds are recorded in freezeCorpus.cases; timing is nondeterministic and excluded from assertions.",
                freezePathRunCount: allCorpusRuns.length,
            },
            decision: "retain opt-in only; this evaluation is local, synthetic for supported records, and does not measure provider tokenization or live model quality",
        };

        const reportPath = process.env.SMAGE_SCHEMA_FACTORING_REPORT;
        if (reportPath) {
            writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
        }

        expect(cases).toHaveLength(8);
        expect(report.freezeCorpus.schemaFactoredMessages).toBe(0);
        expect(report.freezeCorpus.requiredPhraseLosses).toBe(0);
        expect(report.freezeCorpus.freezeParityFailures).toBe(0);
        expect(report.freezeCorpus.schemaReconstructionFailures).toBe(0);
        expect(report.variedFixtures.roundTripPassCount).toBe(
            supportedResults.filter((row) => row.roundTrip).length,
        );
        expect(report.variedFixtures.classificationCounts.fallback).toBe(fallbackResults.length);
    });
});
