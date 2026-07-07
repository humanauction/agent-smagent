export function decayMemory(weight: number, ageMs: number): number {
    const decayFactor = Math.exp(-ageMs / (24 * 60 * 60 * 1000)); // Decay over 24 hours
    return weight * decayFactor;
}
