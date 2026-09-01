import type { SMAGEMessage } from "../index.js";
import type { CCRAnchor } from "./anchor.js";
import type { AnchorMemory } from "../memory/memory.js";

export function fuseAnchorIntent(
    anchor: CCRAnchor,
    userQuery: string,
    memoryAnchors: AnchorMemory[],
): SMAGEMessage {
    const parts: string[] = [];

    // 1. User intent
    parts.push(`User intent: ${userQuery}`);

    // 2. Last user message
    if (anchor.lastUser) {
        parts.push(`Last user message: ${anchor.lastUser.content}`);
    }

    // 3. Last assistant message
    if (anchor.lastAssistant) {
        parts.push(`Last assistant message: ${anchor.lastAssistant.content}`);
    }

    // 4. Topic hint
    if (anchor.summaryHint) {
        parts.push(`Topic hint: ${anchor.summaryHint}`);
    }

    // 5. Relevant anchor memory summaries
    for (const am of memoryAnchors) {
        parts.push(`Relevant past anchor: ${am.summary}`);
    }

    const fusedContent = parts.join("\n");

    return {
        role: "system",
        content: fusedContent,
        meta: {
            anchor: true,
            fused: true,
            priority: 3,
            relevance: 1,
        },
    };
}
