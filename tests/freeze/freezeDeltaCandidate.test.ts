import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeDelta } from "./freezeDelta.js";

describe("Freeze Delta Candidate Reporter", () => {
    it("compares the candidate file against the selected baseline", () => {
        const dir = mkdtempSync(join(tmpdir(), "smage-freeze-candidate-"));
        try {
            const baselinePath = join(dir, "baseline.json");
            const comparePath = join(dir, "candidate.json");
            const reportPath = join(dir, "report.json");
            const row = {
                case_id: "case-1",
                category: "minimal",
                provider: "local",
                intent: "debug",
                input_count: 1,
                tokens: { raw: 4 },
                windowed: [],
                reconstructed: [],
                compressed: [],
                reduced: {},
                counts: {},
                chain_order: ["local"],
                chain_telemetry: [],
                performance: { latency_ms: [1] },
            };
            writeFileSync(baselinePath, JSON.stringify([row]));
            writeFileSync(
                comparePath,
                JSON.stringify([{ ...row, performance: { latency_ms: [99] } }]),
            );

            expect(
                freezeDelta("candidate", {
                    baselinePath,
                    comparePath,
                    reportPath,
                }),
            ).toEqual([]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
