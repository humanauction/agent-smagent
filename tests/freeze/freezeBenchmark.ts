import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";

import {
    mockMessageShort,
    mockMessageMedium,
    mockMessageLong,
} from "../utils/mockMessages.js";

const providers = ["openai", "anthropic", "local"];
const intents = ["debug", "explain", "summarize"];
const messageSets = {
    short: mockMessageShort,
    medium: mockMessageMedium,
    long: mockMessageLong,
};

export async function runFreezeBenchmark() {
    const dir = join(process.cwd(), "tests/_freeze_bench");
    mkdirSync(dir, { recursive: true });

    const results = [];

    for (const provider of providers) {
        for (const intent of intents) {
            for (const [size, messages] of Object.entries(messageSets)) {
                const telemetry = new ProviderChainTelemetry();
                const ccr = new CCRPipeline(telemetry);

                const ccrOptions = {
                    provider,
                    depth: 0.5,
                    cost: 0.5,
                    quality: 0.5,
                    reliability: 0.5,
                    baselineFreeze: true,
                    intent,
                };

                const start = performance.now();
                const shaped = await ccr.run(
                    "bench-session",
                    messages,
                    ccrOptions,
                );
                const end = performance.now();

                const chainConfig = {
                    metrics: {
                        openai: {
                            speed: 0.5,
                            cost: 0.5,
                            depth: 0.5,
                            quality: 0.5,
                            reliability: 0.5,
                        },
                        anthropic: {
                            speed: 0.5,
                            cost: 0.5,
                            depth: 0.5,
                            quality: 0.5,
                            reliability: 0.5,
                        },
                        google: {
                            speed: 0.5,
                            cost: 0.5,
                            depth: 0.5,
                            quality: 0.5,
                            reliability: 0.5,
                        },
                        local: {
                            speed: 0.5,
                            cost: 0.5,
                            depth: 0.5,
                            quality: 0.5,
                            reliability: 0.5,
                        },
                    },
                    weights: {
                        speed: 1,
                        cost: 1,
                        depth: 1,
                        quality: 1,
                        reliability: 1,
                    },
                    baselineFreeze: true,
                };

                const router = new ProviderChainRouter(
                    chainConfig,
                    "bench-session",
                );
                const chainTelemetry = router.getTelemetry();

                results.push({
                    provider,
                    intent,
                    size,
                    latency_ms: end - start,
                    tokens: shaped.tokens,
                    windowed_count: shaped.windowed.length,
                    reconstructed_count: shaped.reconstructed.length,
                    compressed_count: shaped.compressed.length,
                    reduced_length: shaped.reduced.content.length,
                    chain_order: router["chain"],
                    chain_telemetry: chainTelemetry,
                });
            }
        }
    }

    const file = join(dir, "freeze_benchmark.json");
    writeFileSync(file, JSON.stringify(results, null, 2), "utf8");

    return file;
}
