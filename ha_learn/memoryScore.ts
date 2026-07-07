export interface MemoryScoreInput {
    failureType: string;
    frequency: number;
    recencyMs: number;
    wrapperId: string;
}

export function scoreMemory(input: MemoryScoreInput): number {
    let score = 0;

    // severity weighting based on failure type
    switch (input.failureType) {
        case "hallucination":
            score += 5;
            break;
        case "unsafe_code":
            score += 4;
            break;
        case "patch_error":
            score += 3;
            break;
        case "format_error":
            score += 2;
            break;
        default:
            score += 1;
    }
    // frequency weighting: more frequent failures get higher scores
    score += Math.min(input.frequency, 5);

    // recency weighting: more recent failures get higher scores
    if (input.recencyMs < 60_000) score += 5;
    else if (input.recencyMs < 300_000) score += 3;
    else if (input.recencyMs < 3_600_000) score += 1;

    // wrapper-centric weighting: certain wrappers may be more critical than others
    if (input.wrapperId === "aider" && input.failureType === "patch_error") {
        score += 3;
    }
    return score;
}
