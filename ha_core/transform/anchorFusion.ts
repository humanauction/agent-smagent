import { classifyIntent } from "../analyze/classifier.js";
import type { SMAGEMessage } from "../index.js";
import type { CCRAnchor } from "./anchor.js";
import type { AnchorMemory } from "../memory/memory.js";

export async function fuseAnchorIntent(
    anchor: CCRAnchor,
    userQuery: string,
    relevantAnchorMemory: AnchorMemory[],
): Promise<SMAGEMessage> {
    const intent = await classifyIntent(userQuery);
    const summaryParts: string[] = [];

    // 1. User intent
    summaryParts.push(
        `User intent: ${intent.intent} (${intent.confidence.toFixed(2)})`,
    );

    // 2. Last user message
    if (anchor.lastUser) {
        summaryParts.push(`Last user message: ${anchor.lastUser.content}`);
    }

    // 3. Last assistant message
    if (anchor.lastAssistant) {
        summaryParts.push(
            `Last assistant message: ${anchor.lastAssistant.content}`,
        );
    }

    // 4. Topic hint
    if (anchor.summaryHint) {
        summaryParts.push(`Topic hint: ${anchor.summaryHint}`);
    }

    // 5. Relevant anchor memory summaries

    if (relevantAnchorMemory.length > 0) {
        summaryParts.push(
            `Relevant anchors: ${relevantAnchorMemory
                .map((am) => am.summary)
                .join(" | ")}`,
        );
    }

    return {
        role: "system",
        content: summaryParts.join("\n"),
        meta: {
            anchor: true,
            memory: true,
            fused: true,
            intent: intent.intent,
            intentConfidence: intent.confidence,
            priority: 3,
            relevance: 0.9,
        },
    };
}
