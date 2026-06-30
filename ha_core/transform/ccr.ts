import type { SMAGEMessage, SMAGEOptions } from "../index";
import { applyPayloadCompression } from "./payload";
import { applyContextManager } from "./context";
import { dedupeMessages } from "./dedupe";
import { mineMemory, injectMemory } from "../memory/memory";

// Apply compression, context management, memory injection
export async function applyCCR(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    // Mine memory from incoming messages
    mineMemory(messages, agent);

    // Inject memory into the context
    const memoryMessages = injectMemory(agent);

    // Merge memory + messages
    const merged = [...memoryMessages, ...messages];

    // Apply payload compression
    const crushed = await applyPayloadCompression(merged, options);
    const deduped = dedupeMessages(crushed);
    return applyContextManager(deduped, agent, session, options);
}
