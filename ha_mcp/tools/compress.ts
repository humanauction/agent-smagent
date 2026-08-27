import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index.js";
import { applyCCR } from "../../ha_core/transform/ccr.js";
import { timeoutGuard } from "../../ha_core/call/providers/timeout.js";

export async function humanAuction_compress(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
) {
    const shaped = await timeoutGuard(
        applyCCR(messages, agent, session, options),
        90_000,
        `mcp-compress-${session}`,
    );
    return { messages: shaped };
}
