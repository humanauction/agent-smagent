import type { SMAGEMessage } from "../../ha_core/index";
import { tokenCount } from "../../ha_core/analyze/tokens";

export async function humanAuction_stats(messages: SMAGEMessage[]) {
    const total = messages.reduce((sum, m) => sum + tokenCount(m.content), 0);
    return { totalTokens: total, messageCount: messages.length };
}
