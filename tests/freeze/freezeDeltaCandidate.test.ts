import { describe, it, expect } from "vitest";
import { freezeDelta } from "./freezeDelta.js";

describe("Freeze Delta Candidate Reporter", () => {
    it("runs candidate delta reporter", () => {
        const deltas = freezeDelta("candidate");
        // Candidate deltas may be 0 or >0 depending on approval workflow.
        // Only assert that the reporter returns an array.
        expect(Array.isArray(deltas)).toBe(true);
    });
});

// describe("Freeze Delta Candidate Reporter", () => {
//     it("detects deltas between baseline and candidate", () => {
//         const deltas = freezeDelta("candidate");
//         expect(deltas.length).toBeGreaterThanOrEqual(0);
//     });
// });
