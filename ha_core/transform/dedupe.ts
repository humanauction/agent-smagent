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
    const out: SMAGEMessage[] = [];

    for (const msg of messages) {
        const hash = stableHash(msg);

        // System messages: never dedupe
        if (msg.role === "system") {
            out.push(msg);
            continue;
        }

        // User messages: dedupe only exact repeats
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
