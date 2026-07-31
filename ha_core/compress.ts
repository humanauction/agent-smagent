import type { SMAGEMessage, SMAGECompressParams } from "../ha_core/index.js";
import { tokenCount } from "../ha_core/analyze/tokens.js";
import { classifyMessage } from "../ha_core/analyze/classifier.js";
import { compressContent } from "../ha_core/transform/compressors/basic.js";

// reversible cache (MVP)
const SMAGE_CACHE = new Map<string, SMAGEMessage>();

function cacheStore(session: string, index: number, msg: SMAGEMessage) {
    const key = `${session}:${index}`;
    SMAGE_CACHE.set(key, JSON.parse(JSON.stringify(msg)));
    return key;
}

export function retrieveOriginal(
    session: string,
    index: number,
): SMAGEMessage | null {
    return SMAGE_CACHE.get(`${session}:${index}`) ?? null;
}

export async function compress(
    params: SMAGECompressParams,
): Promise<SMAGEMessage[]> {
    const { messages, agent, session } = params;
    const options = params.options ?? {};

    const out: SMAGEMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg) continue;

        // 1. store original
        cacheStore(session, i, msg);

        const kind = classifyMessage(msg);
        const tokens = tokenCount(msg.content);

        // 2. NEVER compress user/system
        if (kind === "user" || kind === "system") {
            out.push(msg);
            continue;
        }

        // 3. NEVER compress short messages
        if (tokens < 200) {
            out.push(msg);
            continue;
        }

        // 4. code compression only if AST mode enabled
        if (kind === "code" && !options.ast) {
            out.push(msg);
            continue;
        }

        // 5. compress tool/log/RAG
        if (kind === "tool_output" || kind === "rag" || kind === "log") {
            out.push({
                ...msg,
                content: compressContent(msg.content),
                meta: { ...(msg.meta ?? {}), compressed: true },
            });
            continue;
        }

        // 6. default: leave untouched
        out.push(msg);
    }

    return out;
}
