export function weightMemory(score: number): number {
    // Convert score → weight (0–1)
    return Math.min(1, score / 10);
}
