import { describe, it } from "vitest";
import { runFreezeBenchmark } from "./freezeBenchmark.js";

describe("Freeze Benchmark Runner", () => {
    it("runs full freeze benchmark suite", async () => {
        const file = await runFreezeBenchmark();
        console.log("✔ Freeze benchmark written:", file);
        await new Promise((r) => setTimeout(r, 10));
    });
});
