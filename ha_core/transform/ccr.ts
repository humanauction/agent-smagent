import type { SMAGEMessage, SMAGEOptions } from "../index.js";

import { mineMemory, injectMemory } from "../memory/memory.js";
import { applyPayloadCompression } from "./payload.js";
import { dedupeMessages } from "./dedupe.js";
import { extractAnchor, mergeAnchor } from "./anchor.js";
import { scoreMessage } from "./relevance.js";
import { assignPriority } from "./priority.js";
import { applyContextWindow } from "./window.js";
import { reconstruct } from "./reconstruct.js";
import { applyOutputReduction } from "../output/reducer.js";

import { reversibleLog } from "../cache/log.js";
import { cacheAppend } from "../cache/store.js";
import { applyContextManager } from "./context.js";

import { learn } from "../../ha_learn/index.js";

export async function applyCCR(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    // 1. Mine memory
    mineMemory(messages, agent);
    reversibleLog(session, "ccr_memory_mined", { messages });

    // 2. Extract anchors BEFORE compression
    const anchor = extractAnchor(messages);
    reversibleLog(session, "ccr_anchor_extracted", anchor);

    // 3. Score learned anchors against user query
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const userQuery = lastUser?.content ?? "";

    const learnedAnchors = learn.scoreRelevance(session, userQuery);
    const combinedAnchor = { ...anchor, ...learnedAnchors };
    reversibleLog(session, "ccr_learned_anchors", learnedAnchors);

    // 4. Payload compression
    const compressedInput = await applyPayloadCompression(messages, options);
    reversibleLog(session, "ccr_compressed_input", compressedInput);

    // 5. Dedupe
    const deduped = dedupeMessages(compressedInput);
    reversibleLog(session, "ccr_dedupe", deduped);

    // 6. Inject memory
    const memoryMessages = injectMemory(agent);
    const merged = [...memoryMessages, ...deduped];
    reversibleLog(session, "ccr_memory_injected", merged);

    // 7. Merge anchors (extracted + learned)

    const mergedAnchors = mergeAnchor(combinedAnchor, merged);
    reversibleLog(session, "ccr_anchor_merged", mergedAnchors);

    // 8. Context manager (priority + relevance + window)
    const shaped = applyContextManager(mergedAnchors, agent, session, options);
    reversibleLog(session, "ccr_shaped", shaped);

    cacheAppend(session, { stage: "shaped", messages: shaped });

    // 9. Score relevance
    const scored = shaped.map((m) => ({
        ...m,
        meta: { ...m.meta, score: scoreMessage(m) },
    }));
    reversibleLog(session, "ccr_scored", scored);

    // 10. Assign priority tiers
    const prioritized = scored.map((m) => ({
        ...m,
        meta: { ...m.meta, priority: assignPriority(m) },
    }));
    reversibleLog(session, "ccr_prioritized", prioritized);

    // 11. Apply context window
    const windowed = applyContextWindow(prioritized, options.maxTokens ?? 4000);
    reversibleLog(session, "ccr_windowed", windowed);

    // 12. Reconstruct final message list
    const reconstructed = reconstruct(windowed, anchor);
    reversibleLog(session, "ccr_reconstructed", reconstructed);

    // 13. Output reduction
    const reduced = await applyOutputReduction(reconstructed);
    reversibleLog(session, "ccr_output_reduced", reduced);

    cacheAppend(session, { stage: "reduced", messages: reduced });

    return reduced;
}
