import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index";
import { applyCCR } from "../../ha_core/transform/ccr";

// this file contains the tools that are called by the MCP server, which are used to compress, retrieve, and analyze messages
export async function humanAuction_compress(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
) {
    const shaped = await applyCCR(messages, agent, session, options);
    return { messages: shaped };
}
