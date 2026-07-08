import type { SMAGEMessage } from "../ha_core/index";

// this file is a store for wrapper memory
//TODO: persistent storage

const MEMORY: Record<string, SMAGEMessage[]> = {};

// normalize memory helper
function normalizeMemory(mem: SMAGEMessage): SMAGEMessage {
    return {
        ...mem,
        meta: {
            ...(mem.meta ?? {}),
            memory: true,
            anchor: true,
        },
    };
}

export function addMemory(wrapperId: string, mem: SMAGEMessage) {
    if (!MEMORY[wrapperId]) MEMORY[wrapperId] = [];
    MEMORY[wrapperId].push(normalizeMemory(mem));
}

export function getMemory(wrapperId: string): SMAGEMessage[] {
    return MEMORY[wrapperId] ?? [];
}
