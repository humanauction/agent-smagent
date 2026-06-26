import { cacheStore } from "./cache/store";
import { applyCCR } from "./transform/ccr";
import type { SMAGECompressParams, SMAGEMessage } from "./index";

export async function compress(
    params: SMAGECompressParams,
): Promise<SMAGEMessage[]> {
    const { messages, session } = params;

    messages.forEach((msg, i) => cacheStore(session, i, msg));

    return applyCCR(
        messages,
        params.agent,
        params.session,
        params.options ?? {},
    );
}
