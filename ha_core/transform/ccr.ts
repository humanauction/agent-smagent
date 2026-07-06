import type { SMAGEMessage, SMAGEOptions } from "../index";

import { mineMemory, injectMemory } from "../memory/memory";
import { applyPayloadCompression } from "./payload";
import { dedupeMessages } from "./dedupe";
import { extractAnchor } from "./anchor";
import { scoreMessage } from "./relevance";
import { assignPriority } from "./priority";
import { applyContextWindow } from "./window";
import { reconstruct } from "./reconstruct";
import { applyOutputReduction } from "../output/reducer";

import { reversibleLog } from "../cache/log";

export async function applyCCR(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    //
    // 1. Mine memory from incoming messages
    //
    mineMemory(messages, agent);
    reversibleLog(session, "ccr_memory_mined", { messages });

    //
    // 2. Payload compression (code folding, log compression, RAG compression, etc.)
    //
    const compressedInput = await applyPayloadCompression(messages, options);
    reversibleLog(session, "ccr_compressed_input", compressedInput);

    //
    // 3. Dedupe
    //
    const deduped = dedupeMessages(compressedInput);
    reversibleLog(session, "ccr_dedupe", deduped);

    //
    // 4. Inject memory (agent‑specific)
    //
    const memoryMessages = injectMemory(agent);
    const merged = [...memoryMessages, ...deduped];
    reversibleLog(session, "ccr_memory_injected", merged);

    //
    // 5. Extract anchors
    //
    const anchors = extractAnchor(merged);
    reversibleLog(session, "ccr_anchor", anchors);

    //
    // 6. Score relevance
    //
    const scored = merged.map((m) => ({
        ...m,
        meta: { ...m.meta, score: scoreMessage(m) },
    }));
    reversibleLog(session, "ccr_scored", scored);

    //
    // 7. Assign priority tiers
    //
    const prioritized = scored.map((m) => ({
        ...m,
        meta: { ...m.meta, priority: assignPriority(m) },
    }));
    reversibleLog(session, "ccr_prioritized", prioritized);

    //
    // 8. Apply context window
    //
    const windowed = applyContextWindow(prioritized, options.maxTokens ?? 4000);
    reversibleLog(session, "ccr_windowed", windowed);

    //
    // 9. Reconstruct final message list (anchors + windowed)
    //
    const reconstructed = reconstruct(windowed, anchors);
    reversibleLog(session, "ccr_reconstructed", reconstructed);

    //
    // 10. Output reduction (final stage)
    //
    const reduced = await applyOutputReduction(reconstructed);
    reversibleLog(session, "ccr_output_reduced", reduced);

    //
    // 11. Return final CCR output
    //
    return reduced;
}
