// this file is for tracking provider reliability based on failure events

export interface ProviderFailureEvent {
    providerId: string;
    provider: string;
    model: string;
    session: string;
    kind: "timeout" | "error" | "empty" | "fallback" | "slow" | "success";
    timestamp: number;
}

export interface ProviderReliabilitySnapshot {
    id: string;
    provider: string;
    model: string;
    failures: number;
    timeouts: number;
    empties: number;
    fallbacks: number;
    slowResponses: number;
    reliability: number; // 0–1
}

export class ProviderReliabilityTracker {
    private events: ProviderFailureEvent[] = [];
    private store: Record<string, ProviderReliabilitySnapshot> = {};

    getSnapshot(providerId: string): ProviderReliabilitySnapshot {
        if (this.store[providerId]) {
            return this.store[providerId];
        }
        return this.snapshot(providerId);
    }

    record(event: ProviderFailureEvent) {
        this.events.push(event);
        const snap = this.snapshot(event.providerId);
        let delta = 0;

        switch (event.kind) {
            case "error":
                delta = -0.25;
                break;
            case "empty":
                delta = -0.15;
                break;
            case "slow":
                delta = -0.1;
                break;
            case "fallback":
                delta = -0.2;
                break;
            case "timeout":
                delta = -0.25;
                break;
            case "success":
                delta = +0.05;
                break;
        }

        const next = Math.max(0, Math.min(1, snap.reliability + delta));

        this.store[event.providerId] = { ...snap, reliability: next };
    }

    snapshot(providerId: string): ProviderReliabilitySnapshot {
        const relevant = this.events.filter((e) => e.providerId === providerId);

        let failures = 0;
        let timeouts = 0;
        let empties = 0;
        let fallbacks = 0;
        let slowResponses = 0;

        for (const e of relevant) {
            failures++;
            if (e.kind === "timeout") timeouts++;
            if (e.kind === "empty") empties++;
            if (e.kind === "fallback") fallbacks++;
            if (e.kind === "slow") slowResponses++;
        }

        const total = relevant.length || 1;

        const penalty =
            timeouts * 0.4 +
            empties * 0.2 +
            fallbacks * 0.2 +
            slowResponses * 0.2;

        const reliability = Math.max(0, 1 - penalty / total);

        const first = relevant[0];

        return {
            id: providerId,
            provider: first?.provider ?? "unknown",
            model: first?.model ?? "unknown",
            failures,
            timeouts,
            empties,
            fallbacks,
            slowResponses,
            reliability,
        };
    }
}
