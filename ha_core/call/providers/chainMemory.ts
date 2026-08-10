export interface ChainMemoryEntry {
    provider: string;
    score: number;
    timestamp: number; // timestamp
}
export class ProviderChainMemory {
    private memory: Map<string, ChainMemoryEntry> = new Map();

    remember(session: string, provider: string, score: number) {
        this.memory.set(session, {
            provider,
            score,
            timestamp: Date.now(),
        });
    }

    recall(session: string): ChainMemoryEntry | null {
        return this.memory.get(session) ?? null;
    }
}
