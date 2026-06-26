import { classifyMessage } from "./analyze/classifier";
import { tokenCount } from "./analyze/tokens";
// import { cacheStore } from "./cache/store";
// import { applyCCR } from "./transform/ccr";
import type { SMAGEMessage, SMAGECompressParams } from "./index";

//
// ─────────────────────────────────────────────────────────────
//  INTERNAL HELPERS (minimal, functional)
// ─────────────────────────────────────────────────────────────
//

function isCodeBlock(msg: SMAGEMessage): boolean {
    return msg.content.trim().startsWith("```");
}

function isToolOutput(msg: SMAGEMessage): boolean {
    return msg.role === "tool";
}

function isRAG(msg: SMAGEMessage): boolean {
    return msg.meta?.rag === true;
}

function isLog(msg: SMAGEMessage): boolean {
    return msg.meta?.log === true;
}

//
// reversible cache (in‑memory for development only)
// TODO: Replace with Redis/SQLite/other persistent store for production use
//
const SMAGE_CACHE = new Map<string, SMAGEMessage>();

function cacheStore(session: string, index: number, msg: SMAGEMessage) {
    const key = `${session}:${index}`;
    SMAGE_CACHE.set(key, JSON.parse(JSON.stringify(msg)));
    return key;
}

//
// - temporary compression for now:
// - Summaries stubbed
// - TODO: entity dictionaries, schema factoring, dedupe, etc.
//
function compressPayload(msg: SMAGEMessage): SMAGEMessage {
    const original = msg.content;

    const summary =
        "[compressed] " + original.split(/\s+/).slice(0, 80).join(" ") + " ...";

    return {
        ...msg,
        content: summary,
        meta: { ...msg.meta, compressed: true },
    };
}

//
// ─────────────────────────────────────────────────────────────
//  MAIN ENTRYPOINT
// ─────────────────────────────────────────────────────────────
//

export async function compress(
    params: SMAGECompressParams,
): Promise<SMAGEMessage[]> {
    const { messages, agent, session } = params;
    const opts = params.options ?? {};

    const out: SMAGEMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // 1. Always store original
        cacheStore(session, i, msg);

        // 2. User messages: NEVER touch
        if (msg.role === "user") {
            out.push(msg);
            continue;
        }

        // 3. System messages: preserved (dynamic extraction later)
        if (msg.role === "system") {
            out.push(msg);
            continue;
        }

        // 4. Code: untouched unless AST compression enabled
        if (isCodeBlock(msg) && !opts.ast) {
            out.push(msg);
            continue;
        }

        // 5. Short content: skip compression
        if (tokenCount(msg.content) < 200) {
            out.push(msg);
            continue;
        }

        // 6. Compressible types
        if (isToolOutput(msg) || isRAG(msg) || isLog(msg)) {
            out.push(compressPayload(msg));
            continue;
        }

        // 7. Default: leave untouched
        out.push(msg);
    }

    return out;
}

//
// ─────────────────────────────────────────────────────────────
//  expose cache retrieval for reversibility
// ─────────────────────────────────────────────────────────────
//

export function retrieveOriginal(
    session: string,
    index: number,
): SMAGEMessage | null {
    return SMAGE_CACHE.get(`${session}:${index}`) ?? null;
}
