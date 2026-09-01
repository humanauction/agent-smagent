import type { SMAGEMessage, SMAGEOptions } from "../index.js";
import { tokenCount } from "../analyze/tokens.js";

/**
 * CCR Payload Compression (Stage 1)
 *
 * Goals:
 * - collapse semantic duplicates
 * - remove filler / low‑signal messages
 * - preserve anchors and high‑priority content
 * - enforce soft token budget per message
 * - keep behaviour deterministic
 */

export async function applyPayloadCompression(
    messages: SMAGEMessage[],
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    const out: SMAGEMessage[] = [];
    const seen = new Set<string>();

    // Optional per‑message cap (fallback to 200 chars)
    const maxChars =
        typeof options.maxPayloadChars === "number"
            ? Math.max(50, options.maxPayloadChars)
            : 200;

    for (const msg of messages) {
        const meta = msg.meta ?? {};

        // 1. Normalize for semantic dedupe
        const normalized = msg.content
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

        if (!normalized) continue;

        // 2. Deduplicate semantic content
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        // 3. Remove obvious filler
        if (
            /^ok|sure|thanks|cool|sounds good|let me think$/i.test(
                msg.content.trim(),
            ) ||
            tokenCount(msg.content) < 3
        ) {
            // anchors are never treated as filler
            if (!meta.anchor) continue;
        }

        // 4. Remove low‑priority messages (unless anchor)
        const priority = meta.priority ?? 0;
        if (priority === 0 && !meta.anchor) continue;

        // 5. Preserve anchors verbatim
        if (meta.anchor) {
            out.push(msg);
            continue;
        }

        // 6. Semantic compression (long → short)
        const trimmed = msg.content.replace(/\s+/g, " ").trim();
        const relevance = meta.relevance ?? 0;

        if (relevance > 0.6) {
            out.push({
                ...msg,
                content:
                    trimmed.length > maxChars * 2
                        ? trimmed.slice(0, maxChars * 2) + " …"
                        : trimmed,
                meta: {
                    ...meta,
                    compressed: true,
                },
            });
            continue;
        }
    }

    return out;
}
