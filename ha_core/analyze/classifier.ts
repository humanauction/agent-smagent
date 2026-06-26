import type { SMAGEMessage } from "../index";

export type MessageKind =
    | "user"
    | "system"
    | "assistant"
    | "tool_output"
    | "rag"
    | "log"
    | "code"
    | "other";

export function classifyMessage(msg: SMAGEMessage): MessageKind {
    if (msg.role === "user") return "user";
    if (msg.role === "system") return "system";
    if (msg.role === "assistant") return "assistant";
    if (msg.role === "tool") return "tool_output";
    if (msg.meta?.rag) return "rag";
    if (msg.meta?.log) return "log";
    if (msg.content.trim().startsWith("```")) return "code";
    return "other";
}
