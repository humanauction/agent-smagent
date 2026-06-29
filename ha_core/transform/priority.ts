import type { SMAGEMessage } from "../index";

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

    // tool messages may include meta, chaning priority based on the meta content.
    // For example, a tool message with meta indicating it is a log message should have a lower priority than a regular tool message.
    if (msg.role === "tool") {
        if (msg.meta?.log === true) return Priority.LOG;
        if (msg.meta?.rag === true) return Priority.LOG;
        return Priority.TOOL;
    }
    return Priority.LOG;
}
