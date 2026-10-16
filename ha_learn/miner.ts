import { cacheRetrieve } from '../ha_core/cache/store.js';
import type { LearningSample, LearningUpdate } from "./types.js";

interface TimelineEntry {
    stage?: unknown;
    ts?: unknown;
    data?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messagesFrom(value: unknown): { role: string; content: string }[] {
    if (!Array.isArray(value)) return [];
    return value.filter(
        (message): message is { role: string; content: string } =>
            isRecord(message) &&
            typeof message.role === "string" &&
            typeof message.content === "string",
    );
}

function sampleFromEntry(
    session: string,
    entry: TimelineEntry,
): LearningSample | null {
    if (typeof entry.stage !== "string") return null;
    const data = isRecord(entry.data) ? entry.data : {};
    const error = typeof data.error === "string" ? data.error : undefined;
    const messages = messagesFrom(data.messages);
    const tokens = isRecord(data.tokens) ? data.tokens : {};
    const reconstruction = isRecord(data.reconstruction_check)
        ? data.reconstruction_check
        : {};

    return {
        session,
        stage: entry.stage,
        timestamp: typeof entry.ts === "number" ? entry.ts : undefined,
        messages,
        provider: typeof data.provider === "string" ? data.provider : undefined,
        model: typeof data.model === "string" ? data.model : undefined,
        error,
        outcome: error ? "error" : messages.length > 0 ? "success" : "observation",
        metrics: {
            inputTokens:
                typeof tokens.input === "number" ? tokens.input : undefined,
            outputTokens:
                typeof tokens.output === "number" ? tokens.output : undefined,
            retentionRate:
                typeof reconstruction.retention_rate === "number"
                    ? reconstruction.retention_rate
                    : undefined,
        },
    };
}

// this file contains the functions used by the MCP server to collect learning samples, mine signals

// this function collects learning samples from the cache for a given session
export function collectSamples(session: string): LearningSample[] {
    const data = cacheRetrieve(session);
    if (!data) return [];

    const samples: LearningSample[] = [];

    // stored stages, e.g. { stage: "original" | "shaped" | "reduced" | "provider_response" }
    if (Array.isArray(data.timeline)) {
        for (const entry of data.timeline) {
            const sample = sampleFromEntry(session, entry as TimelineEntry);
            if (sample) samples.push(sample);
        }
    }

    return samples;
}

// this function mines learning signals from a set of learning samples
export function mineSignals(samples: LearningSample[]): LearningUpdate {
    const update: LearningUpdate = {
        anchors: [],
        priorities: [],
        memories: [],
        reducers: [],
    };
    const seen = new Set<string>();
    for (const sample of samples) {
        const source = {
            session: sample.session,
            stage: sample.stage,
            ...(sample.timestamp === undefined
                ? {}
                : { timestamp: sample.timestamp }),
        };
        if (sample.stage === "shaped") {
            const key = `anchor:${sample.session}:${sample.stage}:${sample.timestamp ?? sample.messages.length}`;
            if (seen.has(key)) continue;
            seen.add(key);
            update.anchors!.push({
                type: "anchor",
                description: "Shaped context window inspected",
                data: sample.messages,
                source,
                outcome: sample.outcome,
            });
        }

        if (sample.stage === "reduced") {
            const key = `reduction:${sample.session}:${sample.stage}:${sample.timestamp ?? sample.messages.length}`;
            if (seen.has(key)) continue;
            seen.add(key);
            update.reducers!.push({
                type: "reduction",
                description: "Final reduced output inspected",
                data: sample.messages,
                source,
                outcome: sample.outcome,
            });
        }

        if (sample.error) {
            const key = `priority:${sample.session}:${sample.stage}:${sample.timestamp ?? sample.error}`;
            if (seen.has(key)) continue;
            seen.add(key);
            update.priorities!.push({
                type: "priority",
                description:
                    "Error occurred; candidate for higher priority context",
                data: { error: sample.error, messages: sample.messages },
                source,
                outcome: sample.outcome,
            });
        }
    }

    return update;
}
