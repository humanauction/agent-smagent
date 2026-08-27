import type { SMAGEMessage } from "../index.js";

// Priority levels for messages.
export interface CCRAnchor {
    system?: SMAGEMessage | null;
    lastUser?: SMAGEMessage | null;
    lastAssistant?: SMAGEMessage | null;
    lastTool?: SMAGEMessage | null;
    summaryHint?: string | null;
    // TODO: add additional metadata fields for anchors
    // intent?: string;          // extracted user intent
    // topic?: string;           // classifier output
    // summary?: string;         // compressed anchor summary
    // tokens?: number;          // token weight
    // priority?: number;        // anchor priority tier
    // Extract pinned messages and last messages of each role from the message history.
}
/**
 * Extract pinned messages and last messages of each role from the message history.
 */
export function extractAnchor(messages: SMAGEMessage[]): CCRAnchor {
    const anchor: CCRAnchor = {
        system: null,
        lastUser: null,
        lastAssistant: null,
        lastTool: null,
        summaryHint: null,
    };

    for (const msg of messages) {
        if (msg.role === "system") anchor.system = msg;
        if (msg.role === "user") anchor.lastUser = msg;
        if (msg.role === "assistant") anchor.lastAssistant = msg;
        if (msg.role === "tool") anchor.lastTool = msg;
        if (msg.role === "summary") {
            anchor.summaryHint = msg.content.slice(0, 120);
        }
    }

    // Fallback summaryHint from pivot message
    const pivot = anchor.lastUser ?? anchor.lastAssistant ?? anchor.system;
    anchor.summaryHint =
        anchor.summaryHint ?? (pivot ? pivot.content.slice(0, 120) : null);

    return anchor;
}

/**
 * Build the anchor spine in deterministic order.
 */
export function applyAnchor(
    _messages: SMAGEMessage[],
    anchor: CCRAnchor,
): SMAGEMessage[] {
    const result: SMAGEMessage[] = [];

    const pushAnchor = (msg: SMAGEMessage | null | undefined) => {
        if (!msg) return;
        result.push({
            ...msg,
            meta: { ...msg.meta, anchor: true },
        });
    };

    // Deterministic anchor spine
    pushAnchor(anchor.system);
    pushAnchor(anchor.lastUser);
    pushAnchor(anchor.lastAssistant);
    pushAnchor(anchor.lastTool);

    if (anchor.summaryHint) {
        result.push({
            role: "summary",
            content: anchor.summaryHint,
            meta: { anchor: true },
        });
    }

    return result;
}

/**
 * CCR integration helper: inject anchors at top of shaped window.
 * Stage‑1 compliant:
 * - tags anchors
 * - dedupes against shaped messages
 * - deterministic ordering
 */
export function mergeAnchor(
    anchor: CCRAnchor,
    shaped: SMAGEMessage[],
): SMAGEMessage[] {
    // 1. Build anchor spine
    const spine = applyAnchor([], anchor);

    // 2. Deduplicate shaped messages against anchor spine
    const spineKeys = new Set(spine.map((m) => `${m.role}:${m.content}`));

    const filteredShaped = shaped.filter(
        (m) => !spineKeys.has(`${m.role}:${m.content}`),
    );

    // 3. Merge deterministically
    return [...spine, ...filteredShaped];
}
