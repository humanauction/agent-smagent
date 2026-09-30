import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
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

    if (!existsSync(baselinePath)) {
        throw new Error(
            `Baseline missing: ${baselinePath}. Please run the benchmark first to generate the baseline benchmark file.`,
        );
    }
    if (!existsSync(comparePath)) {
        throw new Error(
            `Compare file missing: ${comparePath}. Please run the benchmark first to generate the current or candidate benchmark file.`,
        );
    }

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

    const identity = (entry: FreezeBenchEntry) =>
        `${entry.provider}\0${entry.intent}\0${entry.size}`;
    const comparedFields: (keyof FreezeBenchEntry)[] = [
        "tokens",
        "windowed_count",
        "reconstructed_count",
        "compressed_count",
        "reduced_length",
        "chain_order",
        "chain_telemetry",
    ];
    const currentByIdentity = new Map(
        current.map((entry) => [identity(entry), entry]),
    );
    const baselineIds = new Set(baseline.map(identity));

    for (let i = 0; i < baseline.length; i++) {
        const base = baseline[i];
        if (!base) continue;
        const curr = currentByIdentity.get(identity(base));

        const diff: Partial<
            Record<
                keyof FreezeBenchEntry,
                { baseline: unknown; current: unknown }
            >
        > = {};

        if (!curr) {
            diff.provider = { baseline: base.provider, current: "<missing>" };
        } else {
            for (const key of comparedFields) {
                if (JSON.stringify(base[key]) !== JSON.stringify(curr[key])) {
                    diff[key] = {
                        baseline: base[key],
                        current: curr[key],
                    };
                }
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

    for (let i = 0; i < current.length; i++) {
        const curr = current[i];
        if (!curr || baselineIds.has(identity(curr))) continue;
        deltas.push({
            index: baseline.length + i,
            provider: curr.provider,
            intent: curr.intent,
            size: curr.size,
            diff: {
                provider: { baseline: "<missing>", current: curr.provider },
            },
        });
    }
    mkdirSync("tests/_freeze_delta", { recursive: true });
    writeFileSync(
        "tests/_freeze_delta/freeze_delta_report.json",
        JSON.stringify(deltas, null, 2),
        "utf8",
    );

    return deltas;
}
