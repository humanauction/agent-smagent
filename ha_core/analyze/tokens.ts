/**
 * Minimal deterministic token counter for CCR Stage 1.
 * Always returns a number. Never returns undefined or bigint.
 *
 * Rules:
 * - Empty or falsy input → 0
 * - Split on whitespace
 * - Filter out empty segments
 * - Count remaining segments
 */
export function tokenCount(text: string): number {
    if (!text) return 0;

    // Normalize whitespace
    const normalized = text.trim();

    if (normalized.length === 0) return 0;

    // Split on whitespace and count non-empty tokens
    const tokens = normalized.split(/\s+/).filter(Boolean).length;

    return tokens;
}
