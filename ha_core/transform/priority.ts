import type { SMAGEMessage } from "../index.js";
import { scoreRelevance } from "./relevance.js";

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
    if (msg.meta?.anchor) return 0; // pinned anchor messages are always kept
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

export interface PriorityScore {
    message: SMAGEMessage;
    relevance: number;
    tier: 1 | 2 | 3;
}

export function assignPriorityTier(relevance: number): 1 | 2 | 3 {
    if (relevance >= 80) return 1; // critical
    if (relevance >= 40) return 2; // important
    return 3; // background
}

export function scorePriority(messages: SMAGEMessage[]): PriorityScore[] {
    return messages.map((m, i) => {
        const relevance = scoreRelevance(m, i, messages.length);
        const tier = assignPriorityTier(relevance);

        return { message: m, relevance, tier };
    });
}
