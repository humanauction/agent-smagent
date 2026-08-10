// this file contains cache implementation for provider failures in the multi-fallback chain

export interface ChainCacheEntry {
    provider: string;
    lastFailure: number; // timestamp
    reason: string;
}

export class ProviderChainCache {
    private cache: Map<string, ChainCacheEntry> = new Map();
    private readonly ttl = 15_000; // 15 seconds

    markFailure(provider: string, reason: string) {
        this.cache.set(provider, {
            provider,
            lastFailure: Date.now(),
            reason,
        });
    }

    isCached(provider: string): boolean {
        const entry = this.cache.get(provider);
        if (!entry) return false;

        const age = Date.now() - entry.lastFailure;
        return age < this.ttl;
    }

    getReason(provider: string): string | null {
        return this.cache.get(provider)?.reason ?? null;
    }
}
