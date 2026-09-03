// this file contains the provider chain telemetry for debugging and visualization purposes.
export interface ChainTelemetryEvent {
    session: string;
    provider: string;

    // Extended union: includes ALL existing provider-chain stages + ALL CCR stages
    stage:
        | "adapter"
        | "adapter_error"
        | "agent_dispatch"
        | "agent_result"
        | "scoring"
        | "call"
        | "cache_hit"
        | "cache_skip"
        | "dedupe"
        | "failure"
        | "fallback"
        | "finalize"
        | "metrics"
        | "normalize"
        | "pipeline_start"
        | "pipeline_end"
        | "retry"
        | "routing"
        | "selection"
        // --- CCR pipeline stages ---
        | "anchor"
        | "intent"
        | "relevance"
        | "priority"
        | "provider_call"
        | "provider_response"
        | "scoredMessages"
        | "window"
        | "reconstruct"
        | "compress"
        | "reduce";

    agentId?: string;
    cached?: boolean;
    chain?: string;
    confidence?: number;
    counts?: Record<"raw" | "deduped" | "window" | "compressed", number>;
    error?: string;
    fallbackTo?: string;
    finalScore?: number;
    intent?: string;
    metrics?: Record<string, number>;
    memoryBoost?: number;
    messageCount?: number;
    messages?: number;
    model?: string;
    request?: unknown;
    response?: unknown;
    resultSize?: number;
    retryCount?: number;
    retryDelay?: number;
    score?: number;
    scores?: Record<string, number>;
    timestamp?: number;
    tokens?: Record<"raw" | "window" | "compressed" | "reduced", number>;
    weighted?: Record<string, number>;
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
