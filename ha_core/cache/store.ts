import type { SMAGEMessage } from '../index.js';

// This file implements an in-memory cache for storing session-level data and message history.

const SMAGE_CACHE = new Map<string, any>();

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

// Store a single message by index
export function cacheStore(
    session: string,
    index: number,
    msg: SMAGEMessage,
): string {
    const key = `${session}:${index}`;
    SMAGE_CACHE.set(key, clone(msg));
    return key;
}

// Retrieve a single message
export function cacheGet(session: string, index: number): SMAGEMessage | null {
    return SMAGE_CACHE.get(`${session}:${index}`) ?? null;
}

// Store arbitrary session-level data (shaped CCR, provider metadata, etc.)
export function cachePut(session: string, data: any): void {
    const key = `${session}:cache`;
    SMAGE_CACHE.set(key, clone(data));
}

// Retrieve arbitrary session-level data
export function cacheRetrieve(session: string): any | null {
    return SMAGE_CACHE.get(`${session}:cache`) ?? null;
}

// Append to session history (full reversible timeline)
export function cacheAppend(session: string, entry: any): void {
    const key = `${session}:history`;
    const arr = SMAGE_CACHE.get(key) ?? [];
    arr.push(clone(entry));
    SMAGE_CACHE.set(key, arr);
}
