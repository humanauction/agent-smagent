import { getMemory } from '../../ha_learn/memoryStore.js';

export function loadWrapperMemory(wrapperId: string) {
    return getMemory(wrapperId);
}
