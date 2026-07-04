import { cacheAppend } from "./store";

export function reversibleLog(session: string, entry: any) {
    cacheAppend(session, entry);
}
