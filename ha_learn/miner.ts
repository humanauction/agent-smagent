import { cacheRetrieve } from "../ha_core/cache/store";
import type { LearningSample, LearningSignal, LearningUpdate } from "./types";

// this file contains the functions used by the MCP server to collect learning samples, mine signals

// this function collects learning samples from the cache for a given session
export function collectSamples(session: string): LearningSample[] {
    const data = cacheRetrieve(session);
    if (!data) return [];

    const samples: LearningSample[] = [];

    // stored stages, e.g. { stage: "original" | "shaped" | "reduced" | "provider_response" }
    if (Array.isArray(data.timeline)) {
        for (const entry of data.timeline) {
            samples.push({
                session,
                stage: entry.stage,
                messages: entry.messages ?? [],
                provider: entry.provider,
                model: entry.model,
                error: entry.error,
            });
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
    // this loops through the samples and mines signals based on the stage and error properties
    for (const sample of samples) {
        if (sample.stage === "shaped") {
            update.anchors!.push({
                type: "anchor",
                description: "Shaped context window inspected",
                data: sample.messages,
            });
        }

        if (sample.stage === "reduced") {
            update.reducers!.push({
                type: "reduction",
                description: "Final reduced output inspected",
                data: sample.messages,
            });
        }

        if (sample.error) {
            update.priorities!.push({
                type: "priority",
                description:
                    "Error occurred; candidate for higher priority context",
                data: { error: sample.error, messages: sample.messages },
            });
        }
    }

    return update;
}
