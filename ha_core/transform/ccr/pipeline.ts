import type { SMAGEMessage, SMAGEOptions } from "../../index.js";
import { ProviderChainTelemetry } from "../../call/providers/chainTelemetry.js";

// CCR stage modules (real signatures)
import { extractAnchor, mergeAnchor, CCRAnchor } from "../anchor.js";
import { dedupeMessages } from "../dedupe.js";
import { scoreRelevance } from "../relevance.js";
import { assignPriority } from "../priority.js";
import { applyContextWindow } from "../window.js";
import { reconstruct } from "../reconstruct.js";
import { applyPayloadCompression } from "../payload.js";
import { reduceOutput } from "../../output/reducer.js";
import { timeoutGuard, safeTelemetry } from "../../call/providers/timeout.js";

// this file contains the CCR pipeline for processing SMAGE messages through various stages

const CCR_STAGE_TIMEOUT_MS = 20_000; // cap for heavy async CCR stages
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

        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "pipeline_start",
                messageCount: messages.length,
            }),
        );

        // 1. ANCHOR EXTRACTION
        const rawAnchor = extractAnchor(messages);
        const anchor: CCRAnchor = {
            system: rawAnchor.system ?? null,
            lastUser: rawAnchor.lastUser ?? null,
            lastAssistant: rawAnchor.lastAssistant ?? null,
            lastTool: rawAnchor.lastTool ?? null,
        };

        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "anchor",
                messageCount: messages.length,
            }),
        );

        // 2. DEDUPE
        const deduped = dedupeMessages(messages);
        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "dedupe",
                messageCount: deduped.length,
            }),
        );

        // 3. RELEVANCE SCORING
        const scored = await Promise.all(
            deduped.map((m, i) => scoreRelevance(m, i, deduped.length, anchor)),
        );
        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "relevance",
                messageCount: deduped.length,
            }),
        );

        const scoredMessages = deduped.map((m, i) => ({
            ...m,
            meta: { ...m.meta, relevance: scored[i] },
        }));

        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "scoredMessages",
                messageCount: scoredMessages.length,
            }),
        );

        // 4. PRIORITY ASSIGNMENT
        const prioritized = assignPriority(scoredMessages, anchor);
        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "priority",
                messageCount: scoredMessages.length,
            }),
        );

        // 5. CONTEXT WINDOW (new WindowResult API)
        const MAX_TOKENS = 4096;
        const windowResult = applyContextWindow(prioritized, MAX_TOKENS);
        const windowed = windowResult.windowed;

        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "window",
                messageCount: windowed.length,
                tokens: {
                    window: windowResult.tokens,
                    raw: 0,
                    compressed: 0,
                    reduced: 0,
                },
            }),
        );

        // 6. RECONSTRUCT
        const reconstructed = reconstruct(windowed, anchor);
        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "reconstruct",
                messageCount: reconstructed.length,
            }),
        );

        // 7. PAYLOAD COMPRESSION (async, heavy) with timeout
        const compressed = await timeoutGuard(
            applyPayloadCompression(reconstructed, options),
            CCR_STAGE_TIMEOUT_MS,
            `ccr-compress-${session}`,
        );

        function pickLastMsg(
            compressed: SMAGEMessage[],
            reconstructed: SMAGEMessage[],
            original: SMAGEMessage[],
        ): SMAGEMessage {
            if (compressed.length > 0) return compressed.at(-1)!;
            if (reconstructed.length > 0) return reconstructed.at(-1)!;
            if (original.length > 0) return original.at(-1)!;
            throw new Error(
                "CCR pipeline: no messages available for reduction.",
            );
        }

        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "compress",
                messageCount: compressed.length,
            }),
        );

        // 8. OUTPUT REDUCTION
        const reduced = reduceOutput(
            pickLastMsg(compressed, reconstructed, messages),
        );
        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "reduce",
                messageCount: 1,
            }),
        );

        // metrics
        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "metrics",
                tokens: {
                    raw: messages.reduce(
                        (n: number, m: SMAGEMessage) => n + m.content.length,
                        0,
                    ),
                    window: windowResult.tokens,
                    compressed: compressed.reduce(
                        (n: number, m: SMAGEMessage) => n + m.content.length,
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
            }),
        );

        safeTelemetry(() =>
            this.telemetry.record({
                session,
                provider: "ccr",
                stage: "pipeline_end",
                resultSize: 1,
            }),
        );

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
