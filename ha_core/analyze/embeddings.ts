// this file is a stub for embedding generation. It currently generates a deterministic fake embedding based on the input text.
// TODO:replace this with a real model later.

// ha_core/analyze/embeddings.ts
export async function getEmbedding(text: string): Promise<number[]> {
    const tokens = text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);

    const vec: number[] = [];

    for (const t of tokens) {
        let h = 0;
        for (let i = 0; i < t.length; i++) {
            h = (h * 31 + t.charCodeAt(i)) >>> 0;
        }
        vec.push((h % 1000) / 1000);
    }

    if (vec.length === 0) vec.push(0);

    return vec;
}
