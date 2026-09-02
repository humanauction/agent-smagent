// ha_core/transform/semantic.ts
import type { SMAGEMessage } from "../index.js";
import { getEmbedding } from "../analyze/embeddings.js";

// this file is a stub for semantic relevance scoring. Currently generates a deterministic fake embedding based on the input text.
function cosineSim(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    const len = Math.min(a.length, b.length);

    for (let i = 0; i < len; i++) {
        const av = a[i] ?? 0;
        const bv = b[i] ?? 0;
        dot += av * bv;
        magA += av * av;
        magB += bv * bv;
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

export async function semanticEmbedding(
    msg: SMAGEMessage,
    userQuery: string,
): Promise<number> {
    if (!userQuery) return 0;

    const [msgEmb, userEmb] = await Promise.all([
        getEmbedding(msg.content),
        getEmbedding(userQuery),
    ]);

    return cosineSim(msgEmb, userEmb);
}
