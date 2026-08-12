// this file contains the provider chain telemetry for debugging and visualization purposes.
export interface ChainTelemetryEvent {
    session: string;
    provider: string;
    stage:
        | "scoring"
        | "call"
        | "retry"
        | "fallback"
        | "cache_skip"
        | "failure"
        | "normalize"
        | "selection";
    score?: number;
    metrics?: Record<string, number>;
    weighted?: Record<string, number>;
    memoryBoost?: number;
    finalScore?: number;
    cached?: boolean;
    error?: string;
    retryCount?: number;
    retryDelay?: number;
    fallbackTo?: string;
    request?: unknown;
    response?: unknown;
    timestamp?: number;
}

export class ProviderChainTelemetry {
    private events: ChainTelemetryEvent[] = [];

    record(event: ChainTelemetryEvent) {
        this.events.push({
            ...event,
            timestamp: Date.now(),
        });
    }

    getEvents(): ChainTelemetryEvent[] {
        return [...this.events];
    }

    getSession(session: string): ChainTelemetryEvent[] {
        return this.events.filter((e) => e.session === session);
    }

    clearSession(session: string) {
        this.events = this.events.filter((e) => e.session !== session);
    }
}
