import type { SMAGEMessage, SMAGEOptions } from "../../index.js";
import { ProviderChainTelemetry } from "../../call/providers/chainTelemetry.js";

// CCR stage modules (real signatures)
import { extractAnchor, mergeAnchor } from "../anchor.js";
import { dedupeMessages } from "../dedupe.js";
import { scoreRelevance } from "../relevance.js";
import { assignPriorities } from "../priority.js";
import { applyContextWindow } from "../window.js";
import { reconstruct } from "../reconstruct.js";
import { applyPayloadCompression } from "../payload.js";
import { reduceOutput } from "../../output/reducer.js";

// this file contains the CCR pipeline for processing SMAGE messages through various stages

export interface CCRPipelineResult {
    original: SMAGEMessage[];
    anchor: ReturnType<typeof extractAnchor>;
    deduped: SMAGEMessage[];
    scored: number[];
    prioritized: SMAGEMessage[];
    windowed: SMAGEMessage[];
    reconstructed: SMAGEMessage[];
    compressed: SMAGEMessage[];
    reduced: SMAGEMessage;
}

export class CCRPipeline {
    private telemetry: ProviderChainTelemetry;

    constructor(telemetry: ProviderChainTelemetry) {
        this.telemetry = telemetry;
    }

    async run(
        session: string,
        messages: SMAGEMessage[],
        options: SMAGEOptions = {},
    ): Promise<CCRPipelineResult> {
        // CCR start
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "pipeline_start",
            messageCount: messages.length,
        });

        // 1. ANCHOR EXTRACTION
        const anchor = extractAnchor(messages);

        // 2. DEDUPE (operates on full message list)
        const deduped = dedupeMessages(messages);

        // 3. RELEVANCE SCORING (per-message)
        const scored = deduped.map((m, i) =>
            scoreRelevance(m, i, deduped.length),
        );

        // 4. PRIORITY ASSIGNMENT (batch)
        const prioritized = assignPriorities(deduped);

        // 5. CONTEXT WINDOW (requires maxTokens)
        const MAX_TOKENS = 4096;
        const windowed = applyContextWindow(prioritized, MAX_TOKENS);

        // 6. RECONSTRUCT (requires anchor)
        const reconstructed = reconstruct(windowed, anchor);

        // 7. PAYLOAD COMPRESSION (async)
        const compressed = await applyPayloadCompression(
            reconstructed,
            options,
        );

        function pickLastMsg(
            compressed: SMAGEMessage[],
            reconstructed: SMAGEMessage[],
            original: SMAGEMessage[],
        ): SMAGEMessage {
            if (compressed.length > 0) {
                return compressed.at(-1)!;
            }
            if (reconstructed.length > 0) {
                return reconstructed.at(-1)!;
            }
            if (original.length > 0) {
                return original.at(-1)!;
            }
            throw new Error(
                "CCR pipeline: no messages available for reduction. should never actually fire. happy now, ts? FFS tho...",
            );
        }
        // 8. OUTPUT REDUCTION (single message)
        const reduced = reduceOutput(
            pickLastMsg(compressed, reconstructed, messages),
        );

        // CCR end
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "pipeline_end",
            resultSize: 1,
        });

        return {
            original: messages,
            anchor,
            deduped,
            scored,
            prioritized,
            windowed,
            reconstructed,
            compressed,
            reduced,
        };
    }
}
