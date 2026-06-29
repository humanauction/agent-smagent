import type { SMAGEMessage } from "../index";

export interface Anchor {
    system: SMAGEMessage[];
    lastUser?: SMAGEMessage;
    lastAssistant?: SMAGEMessage;
    lastTool?: SMAGEMessage;
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
