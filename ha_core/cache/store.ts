import type { SMAGEMessage } from "../index";

const SMAGE_CACHE = new Map<string, SMAGEMessage>();

export function cacheStore(
    session: string,
    index: number,
    msg: SMAGEMessage,
): string {
    const key = `${session}:${index}`;
    SMAGE_CACHE.set(key, JSON.parse(JSON.stringify(msg)));
    return key;
}

export function cacheGet(session: string, index: number): SMAGEMessage | null {
    return SMAGE_CACHE.get(`${session}:${index}`) ?? null;
}
