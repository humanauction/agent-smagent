import type { SMAGEMessage, SMAGEOptions } from "../index";

export function applyContextManager(
    messages: SMAGEMessage[],
    agent: string,
    session: string,
    options: SMAGEOptions,
): SMAGEMessage[] {
    // TODO: windowing, relevance, cross-agent memory
    return messages;
}
