import type { SMAGEMessage, SMAGEOptions } from "../index.js";

import {
    mineMemory,
    injectMemory,
    rememberAnchor,
    getRelevantAnchorMemory,
} from "../memory/memory.js";
import { applyPayloadCompression } from "./payload.js";
import { dedupeMessages } from "./dedupe.js";
import { CCRAnchor, extractAnchor, mergeAnchor } from "./anchor.js";
import { scoreMessage } from "./relevance.js";
import { assignPriority } from "./priority.js";
import { applyContextWindow } from "./window.js";
import { reconstruct } from "./reconstruct.js";
import { applyOutputReduction } from "../output/reducer.js";

import { reversibleLog } from "../cache/log.js";
import { cacheAppend } from "../cache/store.js";
import { applyContextManager } from "./context.js";

import { scoreLearnedAnchors } from "../../ha_cli/commands/learn.js";
import { fuseAnchorIntent } from "./anchorFusion.js";

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

    // persist anchor snapshot
    await rememberAnchor(agent, session, anchor);

    // 3. User query pivot
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const userQuery = lastUser?.content ?? "";

    // 4. Learned anchors
    const learnedAnchors = await scoreLearnedAnchors(session, userQuery);
    reversibleLog(session, "ccr_learned_anchors", learnedAnchors);

    // 5. Payload compression
    const compressedInput = await applyPayloadCompression(messages, options);
    reversibleLog(session, "ccr_compressed_input", compressedInput);

    // 6. Dedupe
    const deduped = dedupeMessages(compressedInput);
    reversibleLog(session, "ccr_dedupe", deduped);

    // 7. Inject memory
    const memoryMessages = injectMemory(agent, userQuery);
    const merged = [...memoryMessages, ...deduped];
    reversibleLog(session, "ccr_memory_injected", merged);

    // 8. Fuse anchor intent with relevant anchor memory
    const relevantAnchorMemory = getRelevantAnchorMemory(agent, userQuery);
    const fusedAnchorIntent = await fuseAnchorIntent(
        anchor,
        userQuery,
        relevantAnchorMemory,
    );
    reversibleLog(session, "ccr_fused_anchor_intent", fusedAnchorIntent);

    // inject fused anchor at top
    const mergedFusion: SMAGEMessage[] = [fusedAnchorIntent, ...merged];
    reversibleLog(session, "ccr_merged_fusion", mergedFusion);

    // 9. Build combined anchor (structural + learned + intent/topic)
    const combinedAnchor: CCRAnchor = {
        ...anchor,
        learned: learnedAnchors,
        // topic continuity from fused intent/meta
        intent: fusedAnchorIntent.meta?.intent,
        intentConfidence: fusedAnchorIntent.meta?.intentConfidence,
    };

    // 10. Merge anchors (extracted + learned + fused intent)
    const mergedAnchors = mergeAnchor(combinedAnchor, mergedFusion);
    reversibleLog(session, "ccr_anchor_merged", mergedAnchors);

    // 11. Context manager (priority + relevance + window)
    const shaped = await applyContextManager(
        mergedAnchors,
        agent,
        session,
        options,
    );
    reversibleLog(session, "ccr_shaped", shaped);

    cacheAppend(session, { stage: "shaped", messages: shaped });

    // 12. Score relevance (structural scoreMessage, separate from semantic)
    const scored = shaped.map((m) => ({
        ...m,
        meta: { ...m.meta, score: scoreMessage(m) },
    }));
    reversibleLog(session, "ccr_scored", scored);

    // 13. Assign priority tiers (now can use combinedAnchor if you want)
    const prioritized = assignPriority(scored, combinedAnchor);
    reversibleLog(session, "ccr_prioritized", prioritized);

    // 14. Apply context window
    const windowResult = applyContextWindow(
        prioritized,
        options.maxTokens ?? 4000,
    );
    const windowed = windowResult.windowed;

    reversibleLog(session, "ccr_windowed", {
        windowed,
        dropped: windowResult.dropped,
        tokens: windowResult.tokens,
    });

    // 15. Reconstruct final message list
    const reconstructed = reconstruct(windowed, combinedAnchor);
    reversibleLog(session, "ccr_reconstructed", reconstructed);

    // 16. Output reduction
    const reduced = await applyOutputReduction(reconstructed);
    reversibleLog(session, "ccr_output_reduced", reduced);

    cacheAppend(session, { stage: "reduced", messages: reduced });

    return reduced;
}
