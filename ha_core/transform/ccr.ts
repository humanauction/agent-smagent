import type { SMAGEMessage, SMAGEOptions } from "../index";
import { applyPayloadCompression } from "./payload";
import { applyContextManager } from "./context";
import { dedupeMessages } from "./dedupe";

export async function applyCCR(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    const crushed = await applyPayloadCompression(messages, options);
    const deduped = dedupeMessages(crushed);
    return applyContextManager(deduped, agent, session, options);
}
