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
    // 1. Normalize whitespace
    const normalized = msg.content.replace(/\s+/g, " ").trim();

    // 2. If anchor summary exists, prefer it
    const summary = msg.meta?.anchor ? normalized : normalized.slice(0, 200);

    // 3. Build reduced message
    return {
        role: "summary",
        content: summary,
        meta: {
            ...msg.meta,
            reduced: true,
        },
    };
}

export function applyOutputReduction(messages: SMAGEMessage[]): SMAGEMessage[] {
    return messages.map(reduceOutput);
}
