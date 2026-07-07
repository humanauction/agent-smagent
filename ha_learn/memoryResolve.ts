import type { SMAGEMessage } from "../ha_core/index";

export function resolveConflicts(memories: SMAGEMessage[]): SMAGEMessage[] {
    const map = new Map<string, SMAGEMessage>();

    for (const mem of memories) {
        const key = mem.meta.failureType ?? mem.content.slice(0, 50);

        if (!map.has(key)) {
            map.set(key, mem);
        } else {
            const existing = map.get(key)!;
            if ((mem.meta.weight ?? 0) > (existing.meta.weight ?? 0)) {
                map.set(key, mem);
            }
        }
    }

    return [...map.values()];
}
