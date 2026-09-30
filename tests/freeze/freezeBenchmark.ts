import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { performance } from "node:perf_hooks";

import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import { freezeCorpus } from "./freezeCorpus.js";

const providers = ["openai", "anthropic", "local"];
const intents = ["debug", "explain", "summarize"];
const latencyRepetitions = 20;

function percentile(values: number[], percentile: number) {
    const ordered = [...values].sort((a, b) => a - b);
    const index = Math.max(0, Math.ceil(percentile * ordered.length) - 1);
    return ordered[index] ?? 0;
}

function createChainConfig() {
    const metrics = Object.fromEntries(
        ["openai", "anthropic", "google", "local"].map((provider) => [
            provider,
            {
                speed: 0.5,
                cost: 0.5,
                depth: 0.5,
                quality: 0.5,
                reliability: 0.5,
            },
        ]),
    );

    return {
        metrics,
        weights: {
            speed: 1,
            cost: 1,
            depth: 1,
            quality: 1,
            reliability: 1,
        },
        baselineFreeze: true,
    };
}

async function runCase(
    provider: string,
    intent: string,
    messages: (typeof freezeCorpus)[number]["messages"],
) {
    const ccr = new CCRPipeline(new ProviderChainTelemetry());
    return ccr.run("freeze-benchmark-session", structuredClone(messages), {
        provider,
        depth: 0.5,
        cost: 0.5,
        quality: 0.5,
        reliability: 0.5,
        baselineFreeze: true,
        intent,
    });
}

/**
 * Writes deterministic CCR observations plus separately sampled local latency.
 * Pass an output path when intentionally generating an approved baseline.
 */
export async function runFreezeBenchmark(
    outputPath = "tests/_freeze_bench/freeze_benchmark_current.json",
) {
    const outputFile = isAbsolute(outputPath)
        ? outputPath
        : join(process.cwd(), outputPath);
    mkdirSync(dirname(outputFile), { recursive: true });

    const results = [];
    const router = new ProviderChainRouter(
        createChainConfig(),
        "freeze-benchmark-session",
    );
    const chainOrder = router["chain"];
    const chainTelemetry = router.getTelemetry();

    for (const provider of providers) {
        for (const intent of intents) {
            for (const testCase of freezeCorpus) {
                // Warm the path once; exclude it from recorded latency samples.
                await runCase(provider, intent, testCase.messages);

                const latencySamples: number[] = [];
                let shaped:
                    | Awaited<ReturnType<CCRPipeline["run"]>>
                    | undefined;
                for (let run = 0; run < latencyRepetitions; run++) {
                    const start = performance.now();
                    shaped = await runCase(provider, intent, testCase.messages);
                    latencySamples.push(performance.now() - start);
                }
                if (!shaped) {
                    throw new Error(`No benchmark output for ${testCase.id}`);
                }

                const reconstructedText = shaped.reconstructed
                    .map((message) => message.content)
                    .join("\n")
                    .toLocaleLowerCase();
                const requiredFacts = testCase.mustRetain ?? [];
                const retainedFacts = requiredFacts.filter((fact) =>
                    reconstructedText.includes(fact.toLocaleLowerCase()),
                );

                results.push({
                    case_id: testCase.id,
                    category: testCase.category,
                    provider,
                    intent,
                    input_count: testCase.messages.length,
                    tokens: shaped.tokens,
                    windowed: shaped.windowed,
                    reconstructed: shaped.reconstructed,
                    compressed: shaped.compressed,
                    reduced: shaped.reduced,
                    counts: {
                        windowed: shaped.windowed.length,
                        reconstructed: shaped.reconstructed.length,
                        compressed: shaped.compressed.length,
                    },
                    reconstruction_check: {
                        required_facts: requiredFacts,
                        retained_facts: retainedFacts,
                        retention_rate:
                            requiredFacts.length === 0
                                ? 1
                                : retainedFacts.length / requiredFacts.length,
                    },
                    chain_order: chainOrder,
                    chain_telemetry: chainTelemetry,
                    performance: {
                        repetitions: latencySamples.length,
                        latency_ms: latencySamples,
                        median_ms: percentile(latencySamples, 0.5),
                        p95_ms: percentile(latencySamples, 0.95),
                    },
                });
            }
        }
    }

    writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf8");
    return outputFile;
}
