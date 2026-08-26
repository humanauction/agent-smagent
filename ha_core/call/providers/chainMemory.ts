export interface ChainMemoryEntry {
    provider: string;
    score: number;
    timestamp: number; // timestamp
}

const CHAIN_MEMORY_TTL_MS = 5 * 60_000; // 5 minutes
export class ProviderChainMemory {
    private memory: Map<string, ChainMemoryEntry> = new Map();

    private safeMemory<T>(fn: () => T): T | null {
        try {
            return fn();
        } catch {
            return null;
        }
    }

    remember(session: string, provider: string, score: number) {
        this.safeMemory(() => {
            this.memory.set(session, {
                provider,
                score,
                timestamp: Date.now(),
            });
        });
    }

    recall(session: string): ChainMemoryEntry | null {
        return (
            this.safeMemory(() => {
                const entry = this.memory.get(session);
                if (!entry) return null;

                const age = Date.now() - entry.timestamp;
                if (age > CHAIN_MEMORY_TTL_MS) {
                    this.memory.delete(session);
                    return null;
                }

                return entry;
            }) ?? null
        );
    }
}
