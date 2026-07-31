import type { SMAGEMessage } from "../index.js";
import { scoreRelevance } from "./relevance.js";

export enum Priority {
    SYSTEM = 100,
    USER = 90,
    ASSISTANT = 80,
    TOOL = 70,
    LOG = 50,
    ANCHOR = 100,
}

export function priorityOf(msg: SMAGEMessage): Priority {
    if (msg.meta?.anchor) return Priority.ANCHOR;
    switch (msg.role) {
        case "system":
            return Priority.SYSTEM;
        case "user":
            return Priority.USER;
        case "assistant":
            return Priority.ASSISTANT;
        case "tool": // tool messages may include meta, changing priority based on the meta content.
            if (msg.meta?.log || msg.meta?.rag) return Priority.LOG;
            return Priority.TOOL;
        default:
            return Priority.LOG; // For example, a tool message with meta indicating it is a log message should have a lower priority than a regular tool message.
    }
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
    return priorityOf(msg);
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
    if (relevance >= 80) return 1; // critical, maps to SYSTEM/USER/ASSISTANT
    if (relevance >= 60) return 2; // important, maps to TOOL
    return 3; // background, maps to LOG
}

export function scorePriority(messages: SMAGEMessage[]): PriorityScore[] {
    return messages.map((m, i) => {
        const relevance = scoreRelevance(m, i, messages.length);
        const tier = assignPriorityTier(relevance);

        return { message: m, relevance, tier };
    });
}
