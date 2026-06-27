import type { SMAGEMessage, SMAGEOptions } from "../index";
import { tokenCount } from "../analyze/tokens";

const DEFAULT_MAX_TOKENS = 4000;

export function applyContextManager(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): SMAGEMessage[] {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

    // always retain system messages
    const systemMessages: SMAGEMessage[] = [];
    const windowMessages: SMAGEMessage[] = [];

    let runningTotal = 0;

    //
    for (const msg of messages) {
        if (msg.role === "system") {
            systemMessages.push(msg);
            runningTotal += tokenCount(msg.content);
        }
    }

    for (const msg of [...messages].reverse()) {
        if (msg.role === "system") continue;

        const cost = tokenCount(msg.content);
        if (runningTotal + cost > maxTokens) break;

        windowMessages.push(msg);
        runningTotal += cost;
    }

    // Reverse window to restore chronological order
    windowMessages.reverse();

    return [...systemMessages, ...windowMessages];
}
