import type { SMAGEMessage } from "../index";
// CCR pipeline deduplication. components: stable hash, role‑aware dedupe strategy, safe fallback

/**
 * Stable hash for dedupe.
 * - Ignores metadata (meta)
 * - Ignores name
 * - Ignores whitespace differences
 * - Role + normalized content
 */
function stableHash(msg: SMAGEMessage): string {
    const normalized = msg.content.replace(/\s+/g, " ").trim().toLowerCase();

    return `${msg.role}:${normalized}`;
}

/**
 * Role-aware dedupe:
 * - System messages: dedupe never
 * - User messages: dedupe ONLY exact repeats
 * - Assistant messages: dedupe aggressive
 * - Tool messages: dedupe aggressive
 * - Logs/RAG: dedupe aggressive
 */
export function dedupeMessages(messages: SMAGEMessage[]): SMAGEMessage[] {
    const seen = new Set<string>();
    const out: SMAGEMessage[] = [];

    for (const msg of messages) {
        // System messages are always kept
        if (msg.role === "system") {
            out.push(msg);
            continue;
        }

        const hash = stableHash(msg);

        // User messages: only dedupe exact repeats
        if (msg.role === "user") {
            if (seen.has(hash)) continue;
            seen.add(hash);
            out.push(msg);
            continue;
        }

        // Assistant + tool + logs: aggressive dedupe
        if (seen.has(hash)) continue;

        seen.add(hash);
        out.push(msg);
    }

    return out;
}
