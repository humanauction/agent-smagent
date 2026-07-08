import type { SMAGEMessage } from "../ha_core/index";

export function pruneMemory(memories: SMAGEMessage[]): SMAGEMessage[] {
    return memories.filter((m) => (m.meta?.weight ?? 0) > 0.2);
}
