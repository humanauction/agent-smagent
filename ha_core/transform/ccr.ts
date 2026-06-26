import type { SMAGEMessage, SMAGEOptions } from "../index";
import { applyPayloadCompression } from "./payload";
import { applyContextManager } from "./context";

export async function applyCCR(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    // cache alignment already done in compress.ts

    const crushed = await applyPayloadCompression(messages, options);
    const finalContext = applyContextManager(crushed, agent, session, options);
    return finalContext;
}
