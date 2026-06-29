import type { SMAGEMessage, SMAGEOptions } from "../index";
import { tokenCount } from "../analyze/tokens";
import { priorityOf, Priority } from "./priority";

const DEFAULT_MAX_TOKENS = 4000;

export function applyContextManager(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): SMAGEMessage[] {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

    // Group messages by priority
    const buckets: Record<Priority, SMAGEMessage[]> = {
        [Priority.SYSTEM]: [],
        [Priority.USER]: [],
        [Priority.ASSISTANT]: [],
        [Priority.TOOL]: [],
        [Priority.LOG]: [],
    };

    for (const msg of messages) {
        buckets[priorityOf(msg)].push(msg);
    }

    const out: SMAGEMessage[] = [];
    let runningTotal = 0;

    // Fill window by priority tiers
    const tiers: Priority[] = [
        Priority.SYSTEM,
        Priority.USER,
        Priority.ASSISTANT,
        Priority.TOOL,
        Priority.LOG,
    ];

    for (const tier of tiers) {
        const bucket = buckets[tier];

        // Walk backwards (most recent first)
        for (const msg of [...bucket].reverse()) {
            const cost = tokenCount(msg.content);
            if (runningTotal + cost > maxTokens) break;

            out.push(msg);
            runningTotal += cost;
        }
    }

    // Restore chronological order
    return out.reverse();
}
