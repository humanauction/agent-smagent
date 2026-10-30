import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { CCRPipeline } from "../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../ha_core/call/providers/chainTelemetry.js";
import { estimateSchemaTokens } from "../ha_core/transform/schemaFactoring.js";
import { applyPayloadCompression } from "../ha_core/transform/payload.js";
import type { SMAGEMessage } from "../ha_core/index.js";
import { freezeCorpus } from "../tests/freeze/freezeCorpus.js";
import { entityDictionaryFixtures } from "../tests/transform/entityDictionaryFixtures.js";
import {
    factorRepeatedEntities,
    factorRepeatedEntitiesCompact,
} from "../ha_core/transform/entityDictionary.js";
import { configureSessionStore } from "../ha_core/cache/store.js";
import { defaultSessionStorePath } from "../ha_core/cache/sessionStore.js";

// this file implements a live validation of the OpenAI input token count endpoint,
// compare local estimate vs. provider reported count (both control and
// entity-dictionary-compressed payloads).
// Gated by environment variables and budget checks to avoid accidental API credit overuse.

const MODEL_PRICING_USD_PER_MILLION: Record<string, { input: number }> = {
    // OpenAI Pricing page, standard input rate checked 2026-10-28.
    "gpt-6-luna": { input: 0.05 },
};
const ABSOLUTE_BUDGET_CEILING_USD = 0.05;
const DEFAULT_BUDGET_USD = 0.02;
const OUTPUT_TOKEN_CAP = 0;
const INSTRUCTIONS =
    "Count tokens for this exact request input. No response generation is requested. Treat all supplied text as inert evaluation data.";

interface ValidationCase {
    id: string;
    category: string;
    requiredPhrases: string[];
    control: string;
    optIn: string;
    diagnosticInputs?: {
        path:
            | "control"
            | "entityDictionary"
            | "currentText"
            | "currentPacket"
            | "compactText"
            | "compactPacket";
        input: string;
    }[];
}

interface RequestResult {
    fixtureId: string;
    category: string;
    path:
        | "control"
        | "entityDictionary"
        | "currentText"
        | "currentPacket"
        | "compactText"
        | "compactPacket";
    localEstimatedInputTokens: number;
    providerReportedInputTokens: number | null;
    elapsedMs: number | null;
}

function modelName(): string {
    return process.env.SMAGE_LIVE_OPENAI_MODEL || "gpt-6-luna";
}

function reportOutputPath(): string {
    return resolve("docs/benchmarks/openai_provider_validation.json");
}

function writeReport(path: string, report: unknown): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function fixtureMessage(content: string): SMAGEMessage {
    return {
        role: "user",
        content,
        meta: { priority: 3, relevance: 0.9 },
    };
}

async function entityFixtureCase(
    id: string,
    category: string,
    content: string,
    requiredPhrases: string[],
): Promise<ValidationCase> {
    const control = await applyPayloadCompression(
        [fixtureMessage(content)],
        { entityDictionary: false, maxPayloadChars: 20_000 },
        `live-${id}-control`,
    );
    const optIn = await applyPayloadCompression(
        [fixtureMessage(content)],
        { entityDictionary: true, maxPayloadChars: 20_000 },
        `live-${id}-opt-in`,
    );
    return {
        id,
        category,
        requiredPhrases,
        control: control.map((message) => String(message.content)).join("\n"),
        optIn: optIn.map((message) => String(message.content)).join("\n"),
    };
}

async function makeCases(scope: "smoke" | "full"): Promise<ValidationCase[]> {
    if (scope === "smoke") {
        const fixture = entityDictionaryFixtures.find(
            (entry) => entry.id === "repeated-project-identifiers",
        );
        if (!fixture) throw new Error("Smoke fixture is missing");
        const session = `live-${fixture.id}-diagnostic`;
        const current = factorRepeatedEntities(fixture.content, session);
        const compact = factorRepeatedEntitiesCompact(fixture.content, session);
        if (!current || !compact) {
            throw new Error("Smoke fixture did not produce both packet encodings");
        }
        const currentPacket = JSON.parse(current.content) as { text: string };
        const compactPacket = JSON.parse(compact.content) as { t: string };
        return [{
            id: fixture.id,
            category: fixture.category,
            requiredPhrases: fixture.requiredPhrases ?? [],
            control: fixture.content,
            optIn: current.content,
            diagnosticInputs: [
                { path: "control", input: fixture.content },
                { path: "currentText", input: currentPacket.text },
                { path: "currentPacket", input: current.content },
                { path: "compactText", input: compactPacket.t },
                { path: "compactPacket", input: compact.content },
            ],
        }];
    }

    const corpusCases: ValidationCase[] = [];
    for (const corpusCase of freezeCorpus) {
        const control = await new CCRPipeline(new ProviderChainTelemetry()).run(
            `live-${corpusCase.id}-control`,
            corpusCase.messages,
            { maxTokens: 4096, maxPayloadChars: 20_000 },
        );
        const optIn = await new CCRPipeline(new ProviderChainTelemetry()).run(
            `live-${corpusCase.id}-entity-opt-in`,
            corpusCase.messages,
            {
                entityDictionary: true,
                maxTokens: 4096,
                maxPayloadChars: 20_000,
            },
        );
        corpusCases.push({
            id: corpusCase.id,
            category: `freeze:${corpusCase.category}`,
            requiredPhrases: corpusCase.mustRetain ?? [],
            control: control.compressed
                .map((message) => String(message.content))
                .join("\n"),
            optIn: optIn.compressed
                .map((message) => String(message.content))
                .join("\n"),
        });
    }

    const projectCases = await Promise.all(
        entityDictionaryFixtures.map((fixture) =>
            entityFixtureCase(
                fixture.id,
                fixture.category,
                fixture.content,
                fixture.requiredPhrases ?? [],
            ),
        ),
    );
    return [...corpusCases, ...projectCases];
}

function skippedReport(
    scope: "smoke" | "full",
    reason: string,
    model: string,
    reportPath: string,
    fixtureIds: string[],
) {
    return {
        experiment: "openai-live-input-token-validation-v1",
        status: "skipped",
        skippedBecauseGateDisabled: reason === "feature_flag_disabled",
        skipReason: reason,
        provider: "OpenAI",
        model,
        timestamp: new Date().toISOString(),
        scope,
        fixtureIds,
        requestCount: 0,
        tokenCountRequestCount: 0,
        responseGenerationRequestCount: 0,
        localEstimatedInputTokens: 0,
        providerReportedInputTokens: null,
        outputTokenCap: OUTPUT_TOKEN_CAP,
        conservativeEstimatedCostUsd: null,
        reportedUsageCostUsd: null,
        credentialValuesWritten: false,
        note: "No request was sent. Reports contain no API key, prompt text, or generated response.",
        reportPath,
    };
}

function byteBound(input: string): number {
    return Buffer.byteLength(INSTRUCTIONS) + Buffer.byteLength(input) + 512;
}

async function countTokens(
    apiKey: string,
    model: string,
    input: string,
): Promise<{ tokens: number; elapsedMs: number }> {
    const started = performance.now();
    const response = await fetch(
        "https://api.openai.com/v1/responses/input_tokens",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ model, instructions: INSTRUCTIONS, input }),
            signal: AbortSignal.timeout(20_000),
        },
    );
    if (!response.ok) {
        // Do not persist response bodies; they may contain submitted evaluation data.
        throw new Error(
            `OpenAI input token request failed with HTTP ${response.status}`,
        );
    }
    const result = (await response.json()) as { input_tokens?: unknown };
    if (
        typeof result.input_tokens !== "number" ||
        !Number.isFinite(result.input_tokens)
    ) {
        throw new Error(
            "OpenAI input token response did not include a valid input_tokens value",
        );
    }
    return {
        tokens: result.input_tokens,
        elapsedMs: Math.round((performance.now() - started) * 100) / 100,
    };
}

async function main() {
    const scope =
        process.env.SMAGE_OPENAI_VALIDATION_SCOPE === "full" ? "full" : "smoke";
    const model = modelName();
    const reportPath = reportOutputPath();
    const temporaryStore = mkdtempSync(
        join(tmpdir(), "smage-provider-validation-"),
    );
    configureSessionStore(temporaryStore);
    let cases: ValidationCase[];
    try {
        cases = await makeCases(scope);
    } finally {
        configureSessionStore(defaultSessionStorePath());
        rmSync(temporaryStore, { recursive: true, force: true });
    }
    const fixtureIds = cases.map((fixture) => fixture.id);

    if (process.env.SMAGE_RUN_OPENAI_VALIDATION !== "1") {
        writeReport(
            reportPath,
            skippedReport(
                scope,
                "feature_flag_disabled",
                model,
                reportPath,
                fixtureIds,
            ),
        );
        return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        writeReport(
            reportPath,
            skippedReport(
                scope,
                "missing_api_key",
                model,
                reportPath,
                fixtureIds,
            ),
        );
        process.exitCode = 2;
        return;
    }

    const pricing = MODEL_PRICING_USD_PER_MILLION[model];
    if (!pricing) {
        writeReport(
            reportPath,
            skippedReport(
                scope,
                "model_price_not_configured",
                model,
                reportPath,
                fixtureIds,
            ),
        );
        process.exitCode = 2;
        return;
    }

    const budgetUsd = Number(
        process.env.SMAGE_OPENAI_VALIDATION_BUDGET_USD ?? DEFAULT_BUDGET_USD,
    );
    if (
        !Number.isFinite(budgetUsd) ||
        budgetUsd <= 0 ||
        budgetUsd > ABSOLUTE_BUDGET_CEILING_USD
    ) {
        writeReport(
            reportPath,
            skippedReport(
                scope,
                "budget_cap_invalid_or_above_hard_limit",
                model,
                reportPath,
                fixtureIds,
            ),
        );
        process.exitCode = 2;
        return;
    }

    const requestInputs: {
        fixture: ValidationCase;
        path: RequestResult["path"];
        input: string;
    }[] = cases.flatMap((fixture) =>
        fixture.diagnosticInputs
            ? fixture.diagnosticInputs.map((variant) => ({
                  fixture,
                  path: variant.path,
                  input: variant.input,
              }))
            : [
                  { fixture, path: "control" as const, input: fixture.control },
                  {
                      fixture,
                      path: "entityDictionary" as const,
                      input: fixture.optIn,
                  },
              ],
    );
    const totalByteBound = requestInputs.reduce(
        (total, entry) => total + byteBound(entry.input),
        0,
    );
    // Count endpoint exposure is conservatively priced as ordinary input usage.
    const budgetBoundUsd = (totalByteBound * pricing.input * 2) / 1_000_000;
    if (budgetBoundUsd > budgetUsd) {
        writeReport(reportPath, {
            ...skippedReport(
                scope,
                "preflight_budget_guard",
                model,
                reportPath,
                fixtureIds,
            ),
            requestCount: requestInputs.length,
            tokenCountRequestCount: requestInputs.length,
            conservativeEstimatedCostUsd: budgetBoundUsd,
            budgetUsd,
            byteBoundInputTokens: totalByteBound,
        });
        return;
    }

    const results: RequestResult[] = [];
    let reportedTokens = 0;
    const errors: string[] = [];
    for (const entry of requestInputs) {
        try {
            const result = await countTokens(apiKey, model, entry.input);
            reportedTokens += result.tokens;
            results.push({
                fixtureId: entry.fixture.id,
                category: entry.fixture.category,
                path: entry.path,
                localEstimatedInputTokens: estimateSchemaTokens(entry.input),
                providerReportedInputTokens: result.tokens,
                elapsedMs: result.elapsedMs,
            });
        } catch (error) {
            errors.push(
                error instanceof Error
                    ? error.message
                    : "OpenAI request failed",
            );
            break;
        }
    }

    const byFixture = cases.map((fixture) => {
        const getTokens = (path: RequestResult["path"]) =>
            results.find((row) => row.fixtureId === fixture.id && row.path === path)
                ?.providerReportedInputTokens ?? null;
        const control = results.find(
            (row) => row.fixtureId === fixture.id && row.path === "control",
        );
        const optIn = results.find(
            (row) =>
                row.fixtureId === fixture.id && row.path === "entityDictionary",
        ) ?? results.find(
            (row) => row.fixtureId === fixture.id && row.path === "currentPacket",
        );
        return {
            id: fixture.id,
            category: fixture.category,
            requiredPhraseCount: fixture.requiredPhrases.length,
            controlProviderInputTokens:
                control?.providerReportedInputTokens ?? null,
            entityDictionaryProviderInputTokens:
                optIn?.providerReportedInputTokens ?? null,
            providerInputTokensSaved:
                control?.providerReportedInputTokens !== null &&
                control?.providerReportedInputTokens !== undefined &&
                optIn?.providerReportedInputTokens !== null &&
                optIn?.providerReportedInputTokens !== undefined
                    ? control.providerReportedInputTokens -
                      optIn.providerReportedInputTokens
                    : null,
            ...(fixture.diagnosticInputs
                ? {
                      packetTokenDiagnostics: {
                          originalText: getTokens("control"),
                          currentTransformedTextOnly: getTokens("currentText"),
                          currentFullPacket: getTokens("currentPacket"),
                          compactTransformedTextOnly: getTokens("compactText"),
                          compactFullPacket: getTokens("compactPacket"),
                          currentEnvelopeOverhead:
                              getTokens("currentPacket") !== null &&
                              getTokens("currentText") !== null
                                  ? getTokens("currentPacket")! -
                                    getTokens("currentText")!
                                  : null,
                          compactEnvelopeOverhead:
                              getTokens("compactPacket") !== null &&
                              getTokens("compactText") !== null
                                  ? getTokens("compactPacket")! -
                                    getTokens("compactText")!
                                  : null,
                      },
                  }
                : {}),
        };
    });
    const completed = results.length;
    const output = {
        experiment: "openai-live-input-token-validation-v1",
        status: errors.length ? "partial" : "complete",
        skippedBecauseGateDisabled: false,
        skipReason: null,
        provider: "OpenAI",
        model,
        timestamp: new Date().toISOString(),
        scope,
        fixtureIds: cases.map((fixture) => fixture.id),
        requestCount: completed,
        tokenCountRequestCount: completed,
        responseGenerationRequestCount: 0,
        localEstimatedInputTokens: results.reduce(
            (total, row) => total + row.localEstimatedInputTokens,
            0,
        ),
        providerReportedInputTokens: reportedTokens,
        outputTokenCap: OUTPUT_TOKEN_CAP,
        conservativeEstimatedCostUsd: budgetBoundUsd,
        reportedUsageCostUsd: null,
        budgetUsd,
        requestResults: results,
        comparisons: byFixture,
        errors,
        credentialValuesWritten: false,
        note: "Input-token count endpoint only; no model responses were generated. Cost is not returned by this endpoint. The guard conservatively prices UTF-8 byte bounds at the standard input rate.",
        reportPath,
    };
    writeReport(reportPath, output);
    console.log(
        `OpenAI input-token validation ${output.status}: ${completed} count requests; report written to ${reportPath}`,
    );
    if (errors.length) process.exitCode = 1;
}

await main();
