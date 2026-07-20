import type { SMAGEMessage } from "../index.js";

export enum Priority {
    SYSTEM = 0,
    USER = 1,
    ASSISTANT = 2,
    TOOL = 3,
    LOG = 4,
}
export function priorityOf(msg: SMAGEMessage): Priority {
    if (msg.role === "system") return Priority.SYSTEM;
    if (msg.role === "user") return Priority.USER;
    if (msg.role === "assistant") return Priority.ASSISTANT;

    // tool messages may include meta, changing priority based on the meta content.
    // For example, a tool message with meta indicating it is a log message should have a lower priority than a regular tool message.
    if (msg.role === "tool") {
        if (msg.meta?.log === true) return Priority.LOG;
        if (msg.meta?.rag === true) return Priority.LOG;
        return Priority.TOOL;
    }
    return Priority.LOG;
}

/**
 * CCR Priority Tiers (MVP)
 *
 * Priority is a coarse, structural importance score.
 * It is NOT the same as relevance.
 *
 * Tiers:
 *   100 – system messages (always keep)
 *    90 – last user intent (critical)
 *    80 – assistant replies (context continuity)
 *    70 – tool messages (medium importance)
 *    50 – everything else (low importance)
 *
 * Deterministic, cheap, compression‑safe.
 */

export function assignPriority(msg: SMAGEMessage): number {
    if (msg.meta?.anchor) return 0;
    if (msg.role === "system") return 100;
    if (msg.role === "user") return 90;
    if (msg.role === "assistant") return 80;
    if (msg.role === "tool") return 70;
    return 50;
}

/**
 * Batch priority assignment.
 */
export function assignPriorities(messages: SMAGEMessage[]): SMAGEMessage[] {
    return messages.map((m) => ({
        ...m,
        meta: { ...m.meta, priority: assignPriority(m) },
    }));
}
