import type { SMAGEMessage, SMAGEOptions } from "../index";

import { extractAnchor } from "./anchor";
import { dedupeMessages } from "./dedupe";
import { scoreMessage } from "./relevance";
import { assignPriority } from "./priority";
import { applyContextWindow } from "./window";
import { reconstruct } from "./reconstruct";

import { reversibleLog } from "../cache/log";

export function applyContextManager(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): SMAGEMessage[] {
    const maxTokens = options.maxTokens ?? 4000;

    // 1. Extract anchors
    const anchors = extractAnchor(messages);
    reversibleLog(session, "ccr_anchor", anchors);

    // 2. Dedupe
    const deduped = dedupeMessages(messages);
    reversibleLog(session, "ccr_dedupe", deduped);

    // 3. Score relevance
    const scored = deduped.map((m) => ({
        ...m,
        meta: { ...m.meta, score: scoreMessage(m) },
    }));
    reversibleLog(session, "ccr_scored", scored);

    // 4. Assign priority tiers
    const prioritized = scored.map((m) => ({
        ...m,
        meta: { ...m.meta, priority: assignPriority(m) },
    }));
    reversibleLog(session, "ccr_prioritized", prioritized);
    // 5. Apply context window
    const windowed = applyContextWindow(prioritized, maxTokens);
    reversibleLog(session, "ccr_windowed", windowed);

    // 6. Reconstruct final message list
    const reconstructed = reconstruct(windowed, anchors);
    reversibleLog(session, "ccr_reconstructed", reconstructed);

    return reconstructed;
}
