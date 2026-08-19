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
    const pivot = anchor.lastUser ?? anchor.lastAssistant ?? anchor.system;
    anchor.summaryHint = pivot ? pivot.content.slice(0, 120) : null;

    return anchor;
}

export function applyAnchor(
    _messages: SMAGEMessage[],
    anchor: CCRAnchor,
): SMAGEMessage[] {
    const result: SMAGEMessage[] = [];

    // Add system messages first.
    if (anchor.system) result.push(anchor.system);

    // Add the last user message if it exists.
    if (anchor.lastUser) result.push(anchor.lastUser);

    // Add the last assistant message if it exists.
    if (anchor.lastAssistant) result.push(anchor.lastAssistant);

    // Add the last tool message if it exists.
    if (anchor.lastTool) result.push(anchor.lastTool);

    // Add the summary hint if it exists.
    if (!anchor.summaryHint) {
        const pivot = anchor.lastUser ?? anchor.lastAssistant ?? anchor.system;
        if (pivot) {
            anchor.summaryHint = pivot.content.slice(0, 120);
        }
    }
    if (anchor.summaryHint) {
        result.push({
            role: "summary",
            content: anchor.summaryHint,
            meta: { anchor: true },
        });
    }
    return result;
}

// CCR integration Helper: inject anchors at top of shaped window

export function mergeAnchor(
    anchor: CCRAnchor,
    shaped: SMAGEMessage[],
): SMAGEMessage[] {
    const anchorMsgs = applyAnchor([], anchor);
    return [...anchorMsgs, ...shaped];
}
