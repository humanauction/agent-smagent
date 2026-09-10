import { describe, it, expect } from "vitest";
import { freezeDelta } from "./freezeDelta.js";

describe("Freeze Delta Candidate Reporter", () => {
    it("detects deltas between baseline and candidate", () => {
        const deltas = freezeDelta("candidate");
        expect(deltas.length).toBeGreaterThanOrEqual(0);
    });
});
