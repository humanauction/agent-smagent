import { describe, it, expect } from "vitest";
import { freezeDelta } from "./freezeDelta.js";

describe("Freeze CI gate", () => {
    it.skipIf(process.env.SMAGE_FREEZE_GATE !== "1")(
        "writes a report and rejects stable behavior deltas",
        () => {
            const mode =
                process.env.SMAGE_FREEZE_MODE === "candidate"
                    ? "candidate"
                    : "current";
            const deltas = freezeDelta(mode);
            if (process.env.SMAGE_FREEZE_REPORT_ONLY === "1") return;
            expect(deltas).toEqual([]);
        },
    );
});
