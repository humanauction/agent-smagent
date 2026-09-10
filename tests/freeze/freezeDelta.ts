import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

interface FreezeBenchEntry {
    provider: string;
    intent: string;
    size: string;
    latency_ms: number;
    tokens: Record<string, number>;
    windowed_count: number;
    reconstructed_count: number;
    compressed_count: number;
    reduced_length: number;
    chain_order: string[];
    chain_telemetry: unknown;
}

export function freezeDelta(mode: "current" | "candidate" = "current") {
    const baselinePath = "tests/_freeze_bench/freeze_benchmark.json";
    const comparePath =
        mode === "current"
            ? "tests/_freeze_bench/freeze_benchmark_current.json"
            : "tests/_freeze_bench/freeze_benchmark_candidate.json";

    const baseline: FreezeBenchEntry[] = JSON.parse(
        readFileSync(join(process.cwd(), baselinePath), "utf8"),
    );

    const current: FreezeBenchEntry[] = JSON.parse(
        readFileSync(join(process.cwd(), comparePath), "utf8"),
    );

    const deltas: {
        index: number;
        provider: string;
        intent: string;
        size: string;
        diff: Partial<
            Record<
                keyof FreezeBenchEntry,
                { baseline: unknown; current: unknown }
            >
        >;
    }[] = [];

    const length = Math.min(baseline.length, current.length);

    for (let i = 0; i < length; i++) {
        const base = baseline[i];
        const curr = current[i];

        // Guard against undefined
        if (!base || !curr) continue;

        const diff: Partial<
            Record<
                keyof FreezeBenchEntry,
                { baseline: unknown; current: unknown }
            >
        > = {};

        for (const key of Object.keys(base) as (keyof FreezeBenchEntry)[]) {
            if (JSON.stringify(base[key]) !== JSON.stringify(curr[key])) {
                diff[key] = {
                    baseline: base[key],
                    current: curr[key],
                };
            }
        }

        if (Object.keys(diff).length > 0) {
            deltas.push({
                index: i,
                provider: base.provider,
                intent: base.intent,
                size: base.size,
                diff,
            });
        }
    }
    mkdirSync("tests/_freeze_delta", { recursive: true });
    writeFileSync(
        "tests/_freeze_delta/freeze_delta_report.json",
        JSON.stringify(deltas, null, 2),
        "utf8",
    );

    return deltas;
}
