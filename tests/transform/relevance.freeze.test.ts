import { describe, it, expect } from "vitest";
import { scoreRelevance } from "../../ha_core/transform/relevance.js";
import { extractAnchor } from "../../ha_core/transform/anchor.js";
import { mockMessages } from "../utils/mockMessages.js";

describe("scoreRelevance baselineFreeze", () => {
    it("produces identical relevance scores across runs", async () => {
        const anchor = extractAnchor(mockMessages);

        const scores1 = await Promise.all(
            mockMessages.map((m, i) =>
                scoreRelevance(m, i, mockMessages.length, anchor),
            ),
        );
        const scores2 = await Promise.all(
            mockMessages.map((m, i) =>
                scoreRelevance(m, i, mockMessages.length, anchor),
            ),
        );

        expect(JSON.stringify(scores1)).toBe(JSON.stringify(scores2));
    });
});
