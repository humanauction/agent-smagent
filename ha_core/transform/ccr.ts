import type { SMAGEMessage, SMAGEOptions } from "../index";
import { applyPayloadCompression } from "./payload";
import { applyContextManager } from "./context";
import { dedupeMessages } from "./dedupe";
import { mineMemory, injectMemory } from "../memory/memory";
import { applyOutputReduction } from "../output/reducer";
import { cacheAppend } from "../cache/store";

// Apply compression, context management, memory injection
export async function applyCCR(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    // Mine memory from incoming messages
    mineMemory(messages, agent);

    // 2. Compress original messages
    const crushed = await applyPayloadCompression(messages, options);

    // 3. Dedupe
    const deduped = dedupeMessages(crushed);

    // 4. Inject memory
    const memoryMessages = injectMemory(agent);

    // 5. Merge memory + deduped
    const merged = [...memoryMessages, ...deduped];

    // 6. Context manager (anchors + priority + relevance + window)
    const shaped = applyContextManager(merged, agent, session, options);

    // log shaped context window
    cacheAppend(session, {
        stage: "shaped",
        messages: shaped,
    });

    // 7. Output reduction (final stage)
    const reduced = await applyOutputReduction(shaped);

    // log reduced output
    cacheAppend(session, {
        stage: "reduced",
        messages: reduced,
    });

    return reduced;
}
