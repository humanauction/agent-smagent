import type { SMAGEMessage, SMAGEOptions } from "../index.js";
import { extractAnchor } from "./anchor.js";
import { dedupeMessages } from "./dedupe.js";
import { scoreMessage } from "./relevance.js";
import { assignPriority } from "./priority.js";
import { applyContextWindow } from "./window.js";
import { reconstruct } from "./reconstruct.js";

export function applyContextManager(
    messages: SMAGEMessage[],
    _agent: string,
    _session: string,
    options: SMAGEOptions,
): SMAGEMessage[] {
    const maxTokens = options.maxTokens ?? 4000;

    // 1. Extract anchors
    const anchor = extractAnchor(messages);

    // 2. Dedupe
    const deduped = dedupeMessages(messages);

    // 3. Score relevance
    const scored = deduped.map((m) => ({
        ...m,
        meta: { ...m.meta, relevance: scoreMessage(m) },
    }));

    // 4. Assign priority tiers
    const prioritized = assignPriority(scored, anchor);

    // 5. Apply context window (new WindowResult API)
    const windowResult = applyContextWindow(prioritized, maxTokens);
    const windowed = windowResult.windowed;

    // 6. Reconstruct final message list
    return reconstruct(windowed, anchor);
}
