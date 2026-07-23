// this file is for tracking provider reliability based on failure events

export interface ProviderFailureEvent {
    providerId: string;
    provider: string;
    model: string;
    session: string;
    kind: "timeout" | "error" | "empty" | "fallback" | "slow";
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

    record(event: ProviderFailureEvent): void {
        this.events.push(event);
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
