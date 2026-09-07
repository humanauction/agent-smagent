import type { SMAGEMessage, SMAGEOptions } from "../index.js";

export function reduceOutputProviderAware(
    msg: SMAGEMessage,
    options: SMAGEOptions = {},
): SMAGEMessage {
    const meta = msg.meta ?? {};

    const provider = options.provider ?? null;
    const depth = Number(options.depth ?? 0);
    const cost = Number(options.cost ?? 0);
    const quality = Number(options.quality ?? 0);
    const reliability = Number(options.reliability ?? 0);
    const intent = String(options.intent ?? "").toLowerCase();

    // Always preserve anchors fully
    if (meta.anchor) {
        return {
            role: "summary",
            content: msg.content.trim(),
            meta: { ...meta, reduced: true },
        };
    }

    // Normalize whitespace
    const raw = typeof msg.content === "string" ? msg.content : "";
    let content = raw.replace(/\s+/g, " ").trim();

    // Intent-aware preservation
    const keepLong =
        intent.includes("debug") ||
        intent.includes("refactor") ||
        intent.includes("design") ||
        intent.includes("explain");

    // Provider-aware shaping
    let maxLen = 200;

    if (depth > 0.6) maxLen += 200; // deep models → keep more
    if (quality > 0.7) maxLen += 150; // high-quality → keep more
    if (reliability > 0.7) maxLen += 100; // reliable → keep more

    if (cost > 0.6) maxLen -= 100; // cheap → reduce more
    if (provider === "local") maxLen -= 150; // local → aggressive reduction
    if (intent.includes("summarize")) maxLen -= 100; // summarization intent

    if (keepLong) {
        maxLen += 300; // debugging/design/explain → keep more detail
    }

    maxLen = Math.max(50, Math.min(maxLen, 2000));

    // Apply reduction
    const reducedContent =
        content.length > maxLen ? content.slice(0, maxLen) + " …" : content;

    return {
        role: "summary",
        content: reducedContent,
        meta: {
            ...meta,
            reduced: true,
        },
    };
}
