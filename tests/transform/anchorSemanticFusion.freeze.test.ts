import { describe, it, expect } from "vitest";
import { semanticAnchorFusion } from "../../ha_core/transform/anchorSemanticFusion.js";
import { mockMessages } from "../utils/mockMessages.js";

describe("semanticAnchorFusion baselineFreeze", () => {
    it("produces identical fused anchors across runs", () => {
        const run1 = semanticAnchorFusion(mockMessages);
        const run2 = semanticAnchorFusion(mockMessages);

        expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });
});
