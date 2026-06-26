import type { SMAGEMessage, SMAGEOptions } from "../index";
import { applyPayloadCompression } from "./payload";
import { applyContextManager } from "./context";

export async function applyCCR(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    const crushed = await applyPayloadCompression(messages, options);
    return applyContextManager(crushed, agent, session, options);
}
