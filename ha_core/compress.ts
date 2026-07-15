import { cacheStore } from './cache/store.js';
import { applyCCR } from './transform/ccr.js';
import type { SMAGECompressParams, SMAGEMessage } from './index.js';

export async function compress(
    params: SMAGECompressParams,
): Promise<SMAGEMessage[]> {
    const { messages, agent, session } = params;
    const options = params.options ?? {};

    messages.forEach((msg, i) => cacheStore(session, i, msg));

    return applyCCR(messages, agent, session, options);
}
