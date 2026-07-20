import type { SMAGEMessage } from "../index.js";
import type { Anchor } from "./anchor.js";
// Responsibilities
// rebuild final message list
// re‑inject anchors
// re‑inject memory
// re‑inject tool outputs
// ensure reversible mapping

/**
 * CCR Reconstruction (MVP)
 *
 * Responsibilities:
 * - Re‑inject anchor spine at the top
 * - Preserve windowed message order
 * - Deterministic
 * - Pure (no mutation)
 */

export function reconstruct(
    windowed: SMAGEMessage[],
    anchor: Anchor,
): SMAGEMessage[] {
    const out: SMAGEMessage[] = [];

    // 1. System anchors first
    out.push(...anchor.system);

    // 2. Last user
    if (anchor.lastUser) out.push(anchor.lastUser);

    // 3. Last assistant
    if (anchor.lastAssistant) out.push(anchor.lastAssistant);

    // 4. Last tool
    if (anchor.lastTool) out.push(anchor.lastTool);

    // 5. Append windowed messages (already sorted + filtered)
    out.push(...windowed);

    return out;
}
