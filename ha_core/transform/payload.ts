import type { SMAGEMessage, SMAGEOptions } from "../index.js";

/**
 * Semantic compression:
 * - collapse duplicates
 * - remove filler
 * - remove low-priority messages
 * - preserve anchor + priority
 * - preserve meaning
 */

export async function applyPayloadCompression(
    messages: SMAGEMessage[],
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    const out: SMAGEMessage[] = [];
    const seen = new Set<string>();

    for (const msg of messages) {
        const normalized = msg.content
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

        // 1. dedupe semantic content
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        // 2. remove filler
        if (
            /^ok|sure|thanks|cool|sounds good|let me think$/i.test(
                msg.content,
            ) ||
            msg.content.length < 10
        ) {
            continue;
        }

        // 3. remove low-priority messages
        const priority = msg.meta?.priority ?? 0;
        if (priority === 0) continue;

        // 4. preserve anchor + summary
        if (msg.meta?.anchor) {
            out.push(msg);
            continue;
        }

        // 5. semantic compression (long -> short messages)
        const compressedContent =
            msg.content.length > 200
                ? msg.content.slice(0, 200) + " …"
                : msg.content;

        out.push({
            ...msg,
            content: compressedContent,
        });
    }

    return out;
}
