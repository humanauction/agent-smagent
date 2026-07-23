import type { SMAGEMessage, SMAGEOptions } from "../index.js";

import { extractAnchor } from "./anchor.js";
import { dedupeMessages } from "./dedupe.js";
import { scoreMessage } from "./relevance.js";
import { assignPriority } from "./priority.js";
import { applyContextWindow } from "./window.js";
import { reconstruct } from "./reconstruct.js";

import { reversibleLog } from "../cache/log.js";

export function applyContextManager(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): SMAGEMessage[] {
    const maxTokens = options.maxTokens ?? 4000;

    // 1. Extract anchors
    const anchor = extractAnchor(messages);
    reversibleLog(session, "ccr_anchor", anchor);

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
    const reconstructed = reconstruct(windowed, anchor);
    reversibleLog(session, "ccr_reconstructed", reconstructed);

    return reconstructed;
}
