import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeDelta } from "./freezeDelta.js";

const entry = (latency: number) => ({
    case_id: "minimal-two-turn",
    category: "minimal",
    provider: "local",
    intent: "debug",
    input_count: 2,
    tokens: { raw: 10, window: 8, compressed: 7, reduced: 4 },
    windowed: [{ role: "user", content: "hello" }],
    reconstructed: [{ role: "user", content: "hello" }],
    compressed: [{ role: "user", content: "hello" }],
    reduced: { role: "summary", content: "hello" },
    counts: { windowed: 1, reconstructed: 1, compressed: 1 },
    chain_order: ["local"],
    chain_telemetry: [],
    performance: { repetitions: 5, latency_ms: [latency] },
});

describe("Freeze Delta Reporter", () => {
    it("ignores performance variance while comparing deterministic behavior", () => {
        const dir = mkdtempSync(join(tmpdir(), "smage-freeze-delta-"));
        try {
            const baselinePath = join(dir, "baseline.json");
            const comparePath = join(dir, "current.json");
            const reportPath = join(dir, "report.json");
            writeFileSync(baselinePath, JSON.stringify([entry(1.2)]));
            writeFileSync(comparePath, JSON.stringify([entry(2.4)]));

            expect(
                freezeDelta("current", { baselinePath, comparePath, reportPath }),
            ).toEqual([]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it("reports changed behavior and missing or added corpus rows", () => {
        const dir = mkdtempSync(join(tmpdir(), "smage-freeze-delta-"));
        try {
            const baselinePath = join(dir, "baseline.json");
            const comparePath = join(dir, "current.json");
            const reportPath = join(dir, "report.json");
            const changed = { ...entry(1), tokens: { raw: 10, window: 6 } };
            const added = { ...entry(1), case_id: "added-case" };
            writeFileSync(
                baselinePath,
                JSON.stringify([entry(1), { ...entry(1), case_id: "removed-case" }]),
            );
            writeFileSync(comparePath, JSON.stringify([changed, added]));

            const deltas = freezeDelta("current", {
                baselinePath,
                comparePath,
                reportPath,
            });
            expect(deltas).toHaveLength(3);
            expect(deltas[0]?.diff.tokens).toBeDefined();
            expect(deltas[1]?.diff.case_id?.current).toBe("<missing>");
            expect(deltas[2]?.diff.case_id?.baseline).toBe("<missing>");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
