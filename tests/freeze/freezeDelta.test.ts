import { describe, it, expect } from "vitest";
import { freezeDelta } from "./freezeDelta.js";

describe("Freeze Delta Reporter", () => {
    it("detects no deltas when system is stable", () => {
        const deltas = freezeDelta();
        expect(deltas.length).toBe(0);
    });
});
