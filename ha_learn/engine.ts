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

const MAX_ANCHORS_PER_SESSION = 200;
const ANCHOR_TTL_MS = 24 * 60_000 * 60; // 24h

export class SMAGELearningEngine {
    private state: LearningState = { anchors: [] };

    constructor() {}

    private safeMemory<T>(fn: () => T): T | null {
        try {
            return fn();
        } catch {
            return null;
        }
    }

    // ingest a single conversation turn
    ingest(event: LearningEvent) {
        this.safeMemory(() => {
            reversibleLog(event.session, "learn_ingest", event);

            const text = this.extractText(event);
            if (!text.trim()) return;

            const anchor = this.createOrUpdateAnchor(event.session, text);
            reversibleLog(event.session, "learn_anchor", anchor);
        });
    }

    // get anchors for a session (bounded + TTL)
    getAnchors(session: string): Anchor[] {
        const now = Date.now();

        const anchors = this.state.anchors.filter(
            (a) =>
                a.session === session && now - a.lastUpdatedAt <= ANCHOR_TTL_MS,
        );

        if (anchors.length > MAX_ANCHORS_PER_SESSION) {
            anchors.sort((a, b) => a.lastUpdatedAt - b.lastUpdatedAt);
            return anchors.slice(-MAX_ANCHORS_PER_SESSION);
        }

        return anchors;
    }

    // simple relevance scoring (placeholder)
    scoreRelevance(session: string, query: string): Anchor[] {
        const anchors = this.getAnchors(session);

        const scored = anchors
            .map((a) => ({
                ...a,
                score: this.computeScore(a.text, query),
            }))
            .sort((a, b) => b.score - a.score);

        return scored;
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
        const now = Date.now();

        const existing = this.state.anchors.find(
            (a) => a.session === session && a.text === text,
        );

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

// unchanged: runLearningCycle stays as-is
export async function runLearningCycle(
    session: string,
): Promise<LearningUpdate> {
    const samples = collectSamples(session);
    const update = mineSignals(samples);

    const signal = {
        session,
        samples,
        update,
    };

    reversibleLog(session, "learning_signal", signal);
    reversibleLog(session, "learning_update", update);

    return update;
}
