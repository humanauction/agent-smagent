import type { SMAGEMessage } from "../index.js";
/**
 * Stable hash for dedupe.
 * - Ignores metadata
 * - Ignores name
 * - Normalizes whitespace
 * - Lowercases content
 * - Includes role
 */
function stableHash(msg: SMAGEMessage): string {
    const normalized = msg.content.replace(/\s+/g, " ").trim().toLowerCase();
    return `${msg.role}:${normalized}`;
}

function semanticSignature(msg: SMAGEMessage): string {
    return msg.content
        .replace(/[`*~]/g, "") // strip markdown
        .replace(/\s+/g, " ") // normalize whitespace
        .trim()
        .toLowerCase();
}
/**
 * CCR Dedupe:
 *
 * System messages:
 *   - NEVER deduped
 *
 * User messages:
 *   - Deduped only on exact content match
 *
 * Assistant / tool messages:
 *   - Aggressive dedupe (stableHash)
 *
 * Ordering:
 *   - Always preserve original order
 *
 * Deterministic:
 *   - Same input → same output
 */

export function dedupeMessages(messages: SMAGEMessage[]): SMAGEMessage[] {
    const seen = new Set<string>();
    const semanticSeen = new Set<string>();
    const out: SMAGEMessage[] = [];

    let lastHash: string | null = null;

    for (const msg of messages) {
        const hash = stableHash(msg);

        // System messages: never dedupe
        if (msg.role === "system") {
            out.push(msg);
            lastHash = hash;
            continue;
        }

        // User messages: dedupe only exact repeats
        if (msg.role === "user") {
            if (seen.has(hash)) continue;
            seen.add(hash);
            out.push(msg);
            lastHash = hash;
            continue;
        }

        if (msg.role === "summary") {
            if (seen.has(hash)) continue;
            seen.add(hash);
            out.push(msg);
            lastHash = hash;
            continue;
        }
        // Assistant/tool: burst dedupe
        if (hash === lastHash) continue;

        // Assistant/tool: semantic dedupe
        const sig = semanticSignature(msg);
        if (semanticSeen.has(sig)) continue;
        semanticSeen.add(sig);

        // Assistant/tool: hash dedupe
        if (seen.has(hash)) continue;
        seen.add(hash);

        out.push(msg);
        lastHash = hash;
    }

    return out;
}
