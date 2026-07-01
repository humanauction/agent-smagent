import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index";
import { applyCCR } from "../../ha_core/transform/ccr";

export async function humanAuction_compress(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
) {
    const shaped = await applyCCR(messages, agent, session, options);
    return { messages: shaped };
}
