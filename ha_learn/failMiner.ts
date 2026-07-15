import type { SMAGEMessage } from '../ha_core/index.js';
import { addMemory } from './memoryStore.js';

// this file mines failures and adds them to memory for model learning, improvement

export function mineFailure(wrapperId: string, failure: any) {
    const mem: SMAGEMessage = {
        role: "system",
        content: failure.correction,
        meta: {
            anchor: true,
            wrapper: wrapperId,
            memory: true,
            failureType: failure.type,
        },
    };

    addMemory(wrapperId, mem);
}
