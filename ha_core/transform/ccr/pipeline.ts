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
import { CCRAnchor } from "../anchor.js";

// this file contains the CCR pipeline for processing SMAGE messages through various stages

export interface CCRPipelineResult {
    original: SMAGEMessage[];
    anchor: CCRAnchor;
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
        const rawAnchor = extractAnchor(messages);
        const anchor: CCRAnchor = {
            system: rawAnchor.system ?? null,
            lastUser: rawAnchor.lastUser ?? null,
            lastAssistant: rawAnchor.lastAssistant ?? null,
            lastTool: rawAnchor.lastTool ?? null,
        };
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "anchor",
            messageCount: messages.length,
        });

        // 2. DEDUPE (operates on full message list)
        const deduped = dedupeMessages(messages);
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "dedupe",
            messageCount: deduped.length,
        });
        // 3. RELEVANCE SCORING (per-message)
        const scored = deduped.map((m, i) =>
            scoreRelevance(m, i, deduped.length, anchor),
        );
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "relevance",
            messageCount: deduped.length,
        });
        const scoredMessages = deduped.map((m, i) => ({
            ...m,
            meta: { ...m.meta, relevance: scored[i] },
        }));
        // 4. PRIORITY ASSIGNMENT (batch)
        const prioritized = assignPriorities(scoredMessages, anchor);
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "priority",
            messageCount: deduped.length,
        });
        // 5. CONTEXT WINDOW (requires maxTokens)
        const MAX_TOKENS = 4096;
        const windowed = applyContextWindow(prioritized, MAX_TOKENS);
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "window",
            messageCount: windowed.length,
        });
        // 6. RECONSTRUCT (requires anchor)
        const reconstructed = reconstruct(windowed, anchor);
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "reconstruct",
            messageCount: reconstructed.length,
        });
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
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "compress",
            messageCount: compressed.length,
        });
        // 8. OUTPUT REDUCTION (single message)
        const reduced = reduceOutput(
            pickLastMsg(compressed, reconstructed, messages),
        );
        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "reduce",
            messageCount: 1,
        });

        this.telemetry.record({
            session,
            provider: "ccr",
            stage: "metrics",
            tokens: {
                raw: messages.reduce((n, m) => n + m.content.length, 0),
                window: windowed.reduce((n, m) => n + m.content.length, 0),
                compressed: compressed.reduce(
                    (n, m) => n + m.content.length,
                    0,
                ),
                reduced: reduced.content.length,
            },
            counts: {
                raw: messages.length,
                deduped: deduped.length,
                window: windowed.length,
                compressed: compressed.length,
            },
        });

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
