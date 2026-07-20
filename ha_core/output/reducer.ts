import type { SMAGEMessage } from "../index.js";

function isAnchor(msg: SMAGEMessage): boolean {
    return msg.meta?.anchor === true;
}

// Remove CCR metadata but keep meta object shape intact
function stripCCRMeta(meta: Record<string, unknown> | undefined) {
    if (!meta) return { reduced: true };

    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(meta)) {
        // keep only non‑CCR fields
        if (
            key !== "score" &&
            key !== "priority" &&
            key !== "tokens" &&
            key !== "compressed" &&
            key !== "rag" &&
            key !== "log"
        ) {
            cleaned[key] = value;
        }
    }

    cleaned.reduced = true;
    return cleaned;
}

export function reduceOutput(msg: SMAGEMessage): SMAGEMessage {
    // Never reduce system/user or anchors
    if (msg.role === "system" || msg.role === "user" || isAnchor(msg)) {
        return {
            ...msg,
            meta: stripCCRMeta(msg.meta),
        };
    }

    // Only reduce assistant/tool
    if (msg.role !== "assistant" && msg.role !== "tool") {
        return {
            ...msg,
            meta: stripCCRMeta(msg.meta),
        };
    }

    let text = msg.content;

    // Avoid breaking JSON or code blocks
    if (text.includes("{") || text.includes("```")) {
        return {
            ...msg,
            meta: stripCCRMeta(msg.meta),
        };
    }

    // Normalize whitespace
    text = text.replace(/\s+/g, " ").trim();

    const sentences = text.split(/(?<=[.!?])\s+/);

    if (sentences.length <= 3) {
        return {
            ...msg,
            meta: stripCCRMeta(msg.meta),
        };
    }

    const reduced = [
        sentences[0],
        sentences[1],
        sentences[sentences.length - 1],
    ].join(" ");

    return {
        ...msg,
        content: reduced,
        meta: stripCCRMeta(msg.meta),
    };
}

export function applyOutputReduction(messages: SMAGEMessage[]): SMAGEMessage[] {
    return messages.map(reduceOutput);
}
