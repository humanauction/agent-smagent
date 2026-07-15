import { cacheAppend } from "./store.js";

// this is the only logging function, used everywhere in the system to log data to the cache for later inspection
export function reversibleLog(session: string, stage: string, data: any) {
    cacheAppend(session, {
        stage,
        ts: Date.now(),
        data,
    });
}
