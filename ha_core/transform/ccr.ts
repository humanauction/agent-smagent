import type { SMAGEMessage, SMAGEOptions } from "../index";
import { extractAnchor } from "./anchor";
import { dedupeMessages } from "./dedupe";
import { scoreMessage } from "./relevance";
import { assignPriority } from "./priority";
import { applyContextWindow } from "./window";
import { applyPayloadCompression } from "./payload";
import { reconstruct } from "./reconstruct";

export async function applyCCR(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    const anchors = extractAnchor(messages);
    const deduped = dedupeMessages(messages);

    const scored = deduped.map((m) => ({
        ...m,
        meta: { ...m.meta, score: scoreMessage(m) },
    }));

    const prioritized = scored.map((m) => ({
        ...m,
        meta: { ...m.meta, priority: assignPriority(m) },
    }));

    const windowed = applyContextWindow(prioritized, options.maxTokens ?? 4000);

    const compressed = await applyPayloadCompression(windowed, options);

    return reconstruct(compressed, anchors);
}
