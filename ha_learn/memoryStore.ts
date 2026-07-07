import type { SMAGEMessage } from "../ha_core/index";

// this file is a store for wrapper memory

const MEMORY: Record<string, SMAGEMessage[]> = {};

export function addMemory(wrapperId: string, mem: SMAGEMessage) {
    if (!MEMORY[wrapperId]) MEMORY[wrapperId] = [];
    MEMORY[wrapperId].push(mem);
}

export function getMemory(wrapperId: string): SMAGEMessage[] {
    return MEMORY[wrapperId] ?? [];
}

//TODO: persistant storage
