// ha_core/transform/context.ts
import type { SMAGEMessage, SMAGEOptions } from "../index.js";
import { extractAnchor } from "./anchor.js";
import { dedupeMessages } from "./dedupe.js";
import { scoreRelevance } from "./relevance.js";
import { assignPriority } from "./priority.js";
import { applyContextWindow } from "./window.js";
import { reconstruct } from "./reconstruct.js";

export async function applyContextManager(
    messages: SMAGEMessage[],
    _agent: string,
    _session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    const maxTokens = options.maxTokens ?? 4000;

    const anchor = extractAnchor(messages);
    const deduped = dedupeMessages(messages);
    const total = deduped.length;

    const scored = await Promise.all(
        deduped.map(async (m, i) => ({
            ...m,
            meta: {
                ...m.meta,
                relevance: await scoreRelevance(m, i, total, anchor),
            },
        })),
    );

    const prioritized = assignPriority(scored, anchor);
    const windowResult = applyContextWindow(prioritized, maxTokens);
    const windowed = windowResult.windowed;

    return reconstruct(windowed, anchor);
}
