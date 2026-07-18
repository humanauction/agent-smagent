import type { SMAGEMessage } from "../index.js";

// Priority levels for messages.
export interface Anchor {
    system: SMAGEMessage[];
    lastUser?: SMAGEMessage;
    lastAssistant?: SMAGEMessage;
    lastTool?: SMAGEMessage;

    // TODO: add additional metadata fields for anchors
    // intent?: string;          // extracted user intent
    // topic?: string;           // classifier output
    // summary?: string;         // compressed anchor summary
    // tokens?: number;          // token weight
    // priority?: number;        // anchor priority tier
}

// Extract pinned messages and last messages of each role from the message history.
export function extractAnchor(messages: SMAGEMessage[]): Anchor {
    const anchor: Anchor = {
        system: [],
    };

    for (const msg of messages) {
        if (msg.role === "system") anchor.system.push(msg);
        if (msg.role === "user") anchor.lastUser = msg;
        if (msg.role === "assistant") anchor.lastAssistant = msg;
        if (msg.role === "tool") anchor.lastTool = msg;
    }

    return anchor;
}

export function applyAnchor(
    messages: SMAGEMessage[],
    anchor: Anchor,
): SMAGEMessage[] {
    const result: SMAGEMessage[] = [];

    // Add system messages first.
    result.push(...anchor.system);

    // Add the last user message if it exists.
    if (anchor.lastUser) result.push(anchor.lastUser);

    // Add the last assistant message if it exists.
    if (anchor.lastAssistant) result.push(anchor.lastAssistant);

    // Add the last tool message if it exists.
    if (anchor.lastTool) result.push(anchor.lastTool);

    return result;
}
