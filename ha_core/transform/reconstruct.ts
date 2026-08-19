import type { SMAGEMessage } from "../index.js";
import type { CCRAnchor } from "./anchor.js";
import { applyAnchor } from "./anchor.js";

export function reconstruct(
    windowed: SMAGEMessage[],
    anchor: CCRAnchor,
): SMAGEMessage[] {
    // 1. Build anchor block
    const anchorBlock = applyAnchor([], anchor);

    // 2. Merge anchor + window
    const merged = [...anchorBlock, ...windowed];

    // 3. Deduplicate by role+content (preserve metadata)
    const seen = new Set<string>();
    const out: SMAGEMessage[] = [];

    for (const msg of merged) {
        const key = `${msg.role}:${msg.content}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(msg);
    }

    // 4. Preserve chronological order of windowed messages
    out.sort((a, b) => {
        const ai = windowed.indexOf(a);
        const bi = windowed.indexOf(b);

        // Anchor messages come first
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return -1;
        if (bi === -1) return 1;

        return ai - bi;
    });

    return out;
}
