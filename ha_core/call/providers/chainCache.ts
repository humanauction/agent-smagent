import { timeoutGuard, safeTelemetry } from "./timeout.js";

export interface ChainCacheEntry {
    provider: string;
    lastFailure: number; // timestamp
    reason: string;
}

export class ProviderChainCache {
    private cache: Map<string, ChainCacheEntry> = new Map();

    // 15s TTL for failure entries
    private readonly ttl = 15_000;

    // --- safeCache wrapper ---
    private safeCache<T>(fn: () => T): T | null {
        try {
            return fn();
        } catch {
            return null;
        }
    }

    // --- mark failure (timeout-aware) ---
    markFailure(provider: string, reason: string) {
        this.safeCache(() => {
            this.cache.set(provider, {
                provider,
                lastFailure: Date.now(),
                reason,
            });
        });
    }

    // --- internal TTL check ---
    private isFresh(entry: ChainCacheEntry | undefined): boolean {
        if (!entry) return false;
        const age = Date.now() - entry.lastFailure;
        return age < this.ttl;
    }

    // --- cache hit (provider recently failed) ---
    isHit(provider: string): boolean {
        return (
            this.safeCache(() => {
                const entry = this.cache.get(provider);
                return this.isFresh(entry);
            }) ?? false
        );
    }

    // --- cache skip (router should skip provider) ---
    isCached(provider: string): boolean {
        return (
            this.safeCache(() => {
                const entry = this.cache.get(provider);
                return this.isFresh(entry);
            }) ?? false
        );
    }

    // --- failure reason (timeout-aware) ---
    getReason(provider: string): string | null {
        return this.safeCache(() => {
            const entry = this.cache.get(provider);
            if (!entry) return null;
            if (!this.isFresh(entry)) return null;
            return entry.reason;
        });
    }

    // --- get full entry (TTL enforced) ---
    get(provider: string): ChainCacheEntry | null {
        return this.safeCache(() => {
            const entry = this.cache.get(provider);
            if (!entry) return null;

            if (this.isFresh(entry)) {
                return entry;
            }

            // expired → delete
            this.cache.delete(provider);
            return null;
        });
    }
}
