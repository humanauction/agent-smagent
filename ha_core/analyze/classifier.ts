import type { SMAGEMessage } from "../index.js";

export type MessageKind =
    | "user"
    | "system"
    | "assistant"
    | "tool_output"
    | "rag"
    | "log"
    | "code"
    | "other";

export interface IntentResult {
    intent: string;
    confidence: number;
}

const INTENT_PATTERNS: [RegExp, string][] = [
    [/fix|bug|error|stack trace/i, "debug"],
    [/explain|why|how/i, "explain"],
    [/refactor|clean up|rewrite/i, "refactor"],
    [/test|unit test|coverage/i, "testing"],
    [/design|architecture|pattern/i, "design"],
];

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

export async function classifyIntent(text: string): Promise<IntentResult> {
    const trimmed = text.trim();
    if (!trimmed)
        return {
            intent: "general",
            confidence: 0,
        };

    for (const [re, label] of INTENT_PATTERNS) {
        if (re.test(trimmed)) {
            return { intent: label, confidence: 0.8 };
        }
    }
    return { intent: "general", confidence: 0.4 };
}

export interface TopicResult {
    topic: string;
    confidence: number;
}

export async function classifyTopic(text: string): Promise<TopicResult> {
    const lower = text.toLowerCase();

    if (/test|jest|vitest|coverage/.test(lower)) {
        return { topic: "testing", confidence: 0.8 };
    }
    if (/type|ts|typescript|interface/.test(lower)) {
        return { topic: "typing", confidence: 0.8 };
    }
    if (/architecture|design|pattern|module/.test(lower)) {
        return { topic: "architecture", confidence: 0.8 };
    }

    return { topic: "general", confidence: 0.4 };
}

export interface IntentRoutingHints {
    preferDeep?: boolean;
    preferFast?: boolean;
    preferCheap?: boolean;
    preferHighQuality?: boolean;
}

export function intentToRoutingHints(intent: string): IntentRoutingHints {
    const hints: IntentRoutingHints = {};

    switch (intent) {
        case "debug":
            hints.preferDeep = true;
            hints.preferHighQuality = true;
            break;

        case "explain":
            hints.preferHighQuality = true;
            break;

        case "refactor":
            hints.preferDeep = true;
            break;

        case "testing":
            hints.preferHighQuality = true;
            break;

        case "design":
            hints.preferDeep = true;
            hints.preferHighQuality = true;
            break;

        default:
            break;
    }

    return hints;
}
