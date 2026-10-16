import type { SMAGEMessage } from '../index.js';
import {
    defaultSessionStorePath,
    FileSessionStore,
} from './sessionStore.js';

// This file preserves the cache API while storing sessions durably on disk.

let sessionStore = new FileSessionStore(defaultSessionStorePath());

export function configureSessionStore(rootDir: string): void {
    sessionStore = new FileSessionStore(rootDir);
}

// Store a single message by index
export function cacheStore(
    session: string,
    index: number,
    msg: SMAGEMessage,
): string {
    sessionStore.putMessage(session, index, msg);
    const key = `${session}:${index}`;
    return key;
}

// Retrieve a single message
export function cacheGet(session: string, index: number): SMAGEMessage | null {
    return sessionStore.getMessage(session, index) as SMAGEMessage | null;
}

// Store arbitrary session-level data (shaped CCR, provider metadata, etc.)
export function cachePut(session: string, data: any): void {
    sessionStore.putCache(session, data);
}

// Retrieve arbitrary session-level data
export function cacheRetrieve(session: string): any | null {
    const record = sessionStore.get(session);
    if (!record) return null;

    if (record.cache && typeof record.cache === "object") {
        return {
            ...(record.cache as Record<string, unknown>),
            timeline: record.history,
        };
    }

    return { timeline: record.history };
}

// Append to session history (full reversible timeline)
export function cacheAppend(session: string, entry: any): void {
    sessionStore.appendHistory(session, entry);
}

export function cacheDelete(session: string): boolean {
    return sessionStore.delete(session);
}
