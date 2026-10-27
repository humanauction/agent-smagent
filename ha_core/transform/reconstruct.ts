import type { SMAGEMessage } from "../index.js";
import type { CCRAnchor } from "./anchor.js";
import { applyAnchor } from "./anchor.js";
import { restoreFactoredJson } from "./schemaFactoring.js";

/**
 * CCR Reconstruction (Stage 1)
 *
 * Responsibilities:
 * - Re‑inject anchor spine at the top
 * - Preserve windowed message order
 * - Deduplicate deterministically
 * - Deterministic + reversible
 * - Pure (no mutation)
 */

export function reconstruct(
    windowed: SMAGEMessage[],
    anchor: CCRAnchor,
    session?: string,
): SMAGEMessage[] {
    const restoreMessage = (message: SMAGEMessage): SMAGEMessage => {
        const reference = message.meta?.schemaReference;
        if (
            !session ||
            message.meta?.schemaFactored !== true ||
            typeof reference !== "string" ||
            typeof message.content !== "string"
        ) {
            return message;
        }

        const content = restoreFactoredJson(message.content, session, reference);
        if (content === null) return message;

        const {
            schemaFactored: _schemaFactored,
            schemaReference: _schemaReference,
            schemaTokenEstimate: _schemaTokenEstimate,
            ...meta
        } = message.meta ?? {};
        return { ...message, content, meta };
    };

    // 1. Build anchor spine (system + lastUser + lastAssistant + lastTool)
    const spine = applyAnchor([], anchor).map(restoreMessage);

    // 2. Merge spine + window
    const restoredWindow = windowed.map(restoreMessage);
    const merged = [...spine, ...restoredWindow];

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
        const ai = restoredWindow.indexOf(a);
        const bi = restoredWindow.indexOf(b);

        // Both are anchors → preserve spine order
        if (ai === -1 && bi === -1) {
            return spine.indexOf(a) - spine.indexOf(b);
        }

        // Anchors always come first
        if (ai === -1) return -1;
        if (bi === -1) return 1;

        // Both are windowed → chronological order
        return ai - bi;
    });

    return out;
}
