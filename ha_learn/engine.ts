import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { collectSamples, mineSignals } from "./miner.js";
import type { LearningUpdate } from "./types.js";
import { reversibleLog } from "../ha_core/cache/log.js";

// this file contains the main function that runs the learning cycle for a given session

export interface LearningEvent {
    session: string;
    provider: string;
    model: string;
    messages: SMAGEMessage[];
    response: SMAGEMessage | { role: string; content: string };
    ts: number;
}

export interface Anchor {
    id: string;
    session: string;
    text: string;
    score: number;
    createdAt: number;
    lastUpdatedAt: number;
}

export interface LearningState {
    anchors: Anchor[];
}

export class SMAGELearningEngine {
    private state: LearningState = { anchors: [] };

    constructor() {}

    // ingest a single conversation turn
    ingest(event: LearningEvent) {
        reversibleLog(event.session, "learn_ingest", event);

        const text = this.extractText(event);
        if (!text.trim()) return;

        const anchor = this.createOrUpdateAnchor(event.session, text);
        reversibleLog(event.session, "learn_anchor", anchor);
    }

    // get anchors for a session
    getAnchors(session: string): Anchor[] {
        return this.state.anchors.filter((a) => a.session === session);
    }

    // simple relevance scoring (placeholder)
    scoreRelevance(session: string, query: string): Anchor[] {
        const anchors = this.getAnchors(session);
        return anchors
            .map((a) => ({
                ...a,
                score: this.computeScore(a.text, query),
            }))
            .sort((a, b) => b.score - a.score);
    }

    // --- internals ---

    private extractText(event: LearningEvent): string {
        const lastUser = [...event.messages]
            .reverse()
            .find((m) => m.role === "user");

        const responseText =
            "content" in event.response ? event.response.content : "";

        return [lastUser?.content ?? "", responseText].join("\n").trim();
    }

    private createOrUpdateAnchor(session: string, text: string): Anchor {
        const existing = this.state.anchors.find(
            (a) => a.session === session && a.text === text,
        );

        const now = Date.now();

        if (existing) {
            existing.score = Math.min(existing.score + 0.1, 1.0);
            existing.lastUpdatedAt = now;
            return existing;
        }

        const anchor: Anchor = {
            id: `${session}-${now}-${Math.random().toString(36).slice(2)}`,
            session,
            text,
            score: 0.5,
            createdAt: now,
            lastUpdatedAt: now,
        };

        this.state.anchors.push(anchor);
        return anchor;
    }

    private computeScore(anchorText: string, query: string): number {
        const norm = (s: string) =>
            s
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .split(/\s+/);

        const aTokens = new Set(norm(anchorText));
        const qTokens = norm(query);

        if (!qTokens.length) return 0;

        let overlap = 0;
        for (const t of qTokens) {
            if (aTokens.has(t)) overlap++;
        }

        return overlap / qTokens.length;
    }
}

// this function is the orchestrator called from CLI or agents to run the learning cycle
export async function runLearningCycle(
    session: string,
): Promise<LearningUpdate> {
    const samples = collectSamples(session);
    const update = mineSignals(samples);

    // engine-level signal bundle
    const signal = {
        session,
        samples,
        update,
    };

    // TODO: persist update to disk (JSON file) or DB
    // e.g. writeFile(`learn/${session}.json`, JSON.stringify(update, null, 2))

    // unified reversibleLog for learning cycle
    reversibleLog(session, "learning_signal", signal);
    reversibleLog(session, "learning_update", update);

    return update;
}
