import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runFreezeBenchmark } from "./freezeBenchmark.js";
import { freezeCorpus } from "./freezeCorpus.js";

describe("Freeze Benchmark Runner", () => {
    it("runs full freeze benchmark suite", async () => {
        const outputPath = process.env.SMAGE_FREEZE_OUTPUT;
        const file = await runFreezeBenchmark(outputPath);
        const rows: unknown[] = JSON.parse(readFileSync(file, "utf8"));
        expect(rows).toHaveLength(3 * 3 * freezeCorpus.length);
    });
});
