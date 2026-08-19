import type { SMAGEMessage } from "../index.js";
import type { CCRAnchor } from "./anchor.js";

/*
 * CCR Priority Tiers
 */

export function assignPriority(
    msg: SMAGEMessage,
    anchor?: CCRAnchor | null,
): number {
    // Critical system-level messages
    if (msg.role === "system") return 3;

    // Explicit urgency markers
    const lower = msg.content.toLowerCase();
    if (
        lower.includes("urgent") ||
        lower.includes("immediately") ||
        lower.includes("asap") ||
        lower.includes("error") ||
        lower.includes("fix this")
    ) {
        return 3;
    }

    // Anchor proximity boosts priority
    if (anchor) {
        if (msg === anchor.lastUser) return 3;
        if (msg === anchor.lastAssistant) return 2;
        if (msg === anchor.lastTool) return 2;
        if (msg === anchor.system) return 2;
    }

    // Tool outputs are generally important
    if (msg.role === "tool") return 2;

    // User messages are more important than assistant filler
    if (msg.role === "user") return 2;

    // Summary messages are moderately important
    if (msg.role === "summary") return 1;

    // Assistant filler detection
    if (
        /^ok|sure|thanks|cool|sounds good|let me think/i.test(msg.content) ||
        msg.content.length < 10
    ) {
        return 0;
    }

    // Default assistant messages
    if (msg.role === "assistant") return 1;

    // Fallback
    return 1;
}

/**
 * Batch priority assignment.
 */
export function assignPriorities(
    messages: SMAGEMessage[],
    anchor: CCRAnchor | null,
): SMAGEMessage[] {
    return messages.map((m) => ({
        ...m,
        meta: { ...m.meta, priority: assignPriority(m, anchor) },
    }));
}

export interface PriorityScore {
    message: SMAGEMessage;
    relevance: number;
    tier: 1 | 2 | 3;
}
