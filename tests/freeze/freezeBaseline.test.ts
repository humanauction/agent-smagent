import { describe, it } from "vitest";
import { generateFreezeBaseline } from "./freezeBaseline.js";

describe("Generate freeze baseline", () => {
    it("writes freeze snapshots", async () => {
        await generateFreezeBaseline();
        console.log("Freeze baseline snapshots generated successfully.");
        await new Promise((r) => setTimeout(r, 10));
    });
});
