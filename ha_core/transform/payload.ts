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

    // Provider-specific compression shaping
    const provider = options?.provider ?? null;
    const depth = Number(options?.depth ?? 0);
    const cost = Number(options?.cost ?? 0);
    const quality = Number(options?.quality ?? 0);
    const reliability = Number(options?.reliability ?? 0);

    let compressionLevel = 1.0;
    if (depth > 0.6) compressionLevel *= 0.7;
    if (quality > 0.7) compressionLevel *= 0.85;
    if (cost > 0.7) compressionLevel *= 1.3;
    if (reliability > 0.7) compressionLevel *= 0.9;
    if (provider === "local") compressionLevel *= 1.5;

    compressionLevel = Math.max(0.5, Math.min(compressionLevel, 2.0));

    const maxChars =
        typeof options.maxPayloadChars === "number"
            ? Math.max(50, options.maxPayloadChars)
            : 200;

    for (const msg of messages) {
        const meta = msg.meta ?? {};

        const normalized = msg.content
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
        if (!normalized) continue;

        if (seen.has(normalized)) continue;
        seen.add(normalized);

        if (
            /^ok|sure|thanks|cool|sounds good|let me think$/i.test(
                msg.content.trim(),
            ) ||
            tokenCount(msg.content) < 3
        ) {
            if (!meta.anchor) continue;
        }

        const priority = meta.priority ?? 0;
        if (priority === 0 && !meta.anchor) continue;

        if (meta.anchor) {
            out.push(msg);
            continue;
        }

        const trimmed = msg.content.replace(/\s+/g, " ").trim();
        const relevance = meta.relevance ?? 0;

        if (relevance > 0.6) {
            out.push({
                ...msg,
                content:
                    trimmed.length > maxChars * 2
                        ? trimmed.slice(0, maxChars * 2) + " …"
                        : trimmed,
                meta: { ...meta, compressed: true },
            });
            continue;
        }

        const content = msg.content.slice(
            0,
            Math.floor(msg.content.length / compressionLevel),
        );

        out.push({
            ...msg,
            content,
            meta: { ...meta, compressed: true },
        });
    }

    return out;
}
