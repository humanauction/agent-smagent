import { getMemory } from "../../ha_learn/memoryStore";

export function loadWrapperMemory(wrapperId: string) {
    return getMemory(wrapperId);
}
