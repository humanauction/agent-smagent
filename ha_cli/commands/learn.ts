import { runLearningCycle } from "../../ha_learn/engine.js";
import type { SMAGEMessage } from "../../ha_core/index.js";
import type { LearningUpdate, LearningSignal } from "../../ha_learn/types.js";

export async function runLearn(session: string) {
    const update = await runLearningCycle(session);
    console.log(JSON.stringify(update, null, 2));
}

export async function scoreLearnedAnchors(
    session: string,
    userQuery: string,
): Promise<SMAGEMessage[]> {
    const update: LearningUpdate = await runLearningCycle(session);

    const signals = update.anchors ?? [];
    const anchors: SMAGEMessage[] = [];

    for (const sig of signals) {
        // conservative: use description + data if present
        const baseTextParts: string[] = [];

        if (sig.description) baseTextParts.push(sig.description);

        if (sig.data) {
            if (typeof sig.data === "string") {
                baseTextParts.push(sig.data);
            } else if (Array.isArray(sig.data)) {
                // e.g. [{ role, content }]
                const first = sig.data[0] as any;
                if (first?.content) baseTextParts.push(first.content);
            } else if (typeof sig.data === "object") {
                if ("content" in sig.data) {
                    baseTextParts.push(String((sig.data as any).content));
                } else if ("summary" in sig.data) {
                    baseTextParts.push(String((sig.data as any).summary));
                }
            }
        }

        const text = baseTextParts.join(" — ").trim();
        if (!text) continue;

        anchors.push({
            role: "system", // learned anchor context
            content: text,
            meta: {
                anchor: true,
                learned: true,
                relevance: 0.85,
                priority: 3,
            },
        });
    }

    return anchors;
}
