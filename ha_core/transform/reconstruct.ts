import type { SMAGEMessage } from "../index";
import type { Anchor } from "./anchor";
// Responsibilities
// rebuild final message list
// re‑inject anchors
// re‑inject memory
// re‑inject tool outputs
// ensure reversible mapping
export function reconstruct(
    messages: SMAGEMessage[],
    anchors: Anchor,
): SMAGEMessage[] {
    return [...anchors.system, ...messages];
}
