import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

interface FreezeBenchEntry {
    case_id?: string;
    category?: string;
    provider: string;
    intent: string;
    size?: string;
    input_count?: number;
    tokens?: unknown;
    windowed?: unknown;
    reconstructed?: unknown;
    compressed?: unknown;
    reduced?: unknown;
    counts?: unknown;
    reconstruction_check?: unknown;
    chain_order?: unknown;
    chain_telemetry?: unknown;
    performance?: unknown;
}

type FreezeDeltaEntry = {
    index: number;
    case_id?: string;
    category?: string;
    provider: string;
    intent: string;
    size?: string;
    diff: Partial<
        Record<keyof FreezeBenchEntry, { baseline: unknown; current: unknown }>
    >;
};

export interface FreezeDeltaOptions {
    baselinePath?: string;
    comparePath?: string;
    reportPath?: string;
}

function resolvePath(path: string) {
    return isAbsolute(path) ? path : join(process.cwd(), path);
}

function readEntries(path: string): FreezeBenchEntry[] {
    if (!existsSync(path)) {
        throw new Error(`Freeze benchmark file missing: ${path}`);
    }
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(value)) {
        throw new Error(`Freeze benchmark must be an array: ${path}`);
    }
    return value as FreezeBenchEntry[];
}

function identity(entry: FreezeBenchEntry) {
    return `${entry.provider}\0${entry.intent}\0${entry.case_id ?? entry.size ?? ""}`;
}

export function freezeDelta(
    mode: "current" | "candidate" = "current",
    options: FreezeDeltaOptions = {},
) {
    const baselinePath = resolvePath(
        options.baselinePath ??
            process.env.SMAGE_FREEZE_BASELINE ??
            "tests/_freeze_bench/freeze_benchmark.json",
    );
    const comparePath = resolvePath(
        options.comparePath ??
            (mode === "current"
                ? "tests/_freeze_bench/freeze_benchmark_current.json"
                : "tests/_freeze_bench/freeze_benchmark_candidate.json"),
    );
    const reportPath = resolvePath(
        options.reportPath ?? "tests/_freeze_delta/freeze_delta_report.json",
    );

    const baseline = readEntries(baselinePath);
    const current = readEntries(comparePath);
    const deltas: FreezeDeltaEntry[] = [];
    const stableFields: (keyof FreezeBenchEntry)[] = [
        "category",
        "input_count",
        "tokens",
        "windowed",
        "reconstructed",
        "compressed",
        "reduced",
        "counts",
        "reconstruction_check",
        "chain_order",
        "chain_telemetry",
    ];
    const currentByIdentity = new Map<string, FreezeBenchEntry>();
    for (const entry of current) {
        const key = identity(entry);
        if (currentByIdentity.has(key)) {
            throw new Error(
                `Duplicate benchmark case identity in compare file: ${key}`,
            );
        }
        currentByIdentity.set(key, entry);
    }

    const baselineIds = new Set<string>();
    for (let i = 0; i < baseline.length; i++) {
        const base = baseline[i];
        if (!base) continue;
        const key = identity(base);
        if (baselineIds.has(key)) {
            throw new Error(
                `Duplicate benchmark case identity in baseline file: ${key}`,
            );
        }
        baselineIds.add(key);

        const curr = currentByIdentity.get(key);
        const diff: FreezeDeltaEntry["diff"] = {};
        if (!curr) {
            diff.case_id = {
                baseline: base.case_id ?? base.size,
                current: "<missing>",
            };
        } else {
            for (const field of stableFields) {
                if (JSON.stringify(base[field]) !== JSON.stringify(curr[field])) {
                    diff[field] = {
                        baseline: base[field],
                        current: curr[field],
                    };
                }
            }
        }

        if (Object.keys(diff).length > 0) {
            deltas.push({
                index: i,
                case_id: base.case_id,
                category: base.category,
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
            case_id: curr.case_id,
            category: curr.category,
            provider: curr.provider,
            intent: curr.intent,
            size: curr.size,
            diff: {
                case_id: {
                    baseline: "<missing>",
                    current: curr.case_id ?? curr.size,
                },
            },
        });
    }

    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(deltas, null, 2), "utf8");
    return deltas;
}
