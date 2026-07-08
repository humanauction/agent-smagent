import type { SMAGEMessage } from "../ha_core/index";

export function resolveConflicts(memories: SMAGEMessage[]): SMAGEMessage[] {
    const map = new Map<string, SMAGEMessage>();

    for (const mem of memories) {
        const meta = mem.meta ?? {};
        const key = meta.failureType ?? mem.content.slice(0, 50);

        if (!map.has(key)) {
            map.set(key, mem);
        } else {
            const existing = map.get(key)!;
            const memWeight = mem.meta?.weight ?? 0;
            const existingWeight = existing.meta?.weight ?? 0;
            if (memWeight > existingWeight) {
                map.set(key, mem);
            }
        }
    }

    return [...map.values()];
}
