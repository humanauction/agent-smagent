import type { SMAGEMessage } from "../index";
// reduce assistant output tokens before returning the response to the caller.
//TODO: semantic summarization, specific reduction rules: agent, model, tool.
/**
 * Reduce verbosity in assistant/tool messages.
 * - Collapse repeated whitespace
 * - Remove filler sentences
 * - Trim long paragraphs
 * - Keep first N sentences
 * - Keep last N sentences
 */

export function reduceOutput(msg: SMAGEMessage): SMAGEMessage {
    // Only reduce assistant + tool output
    if (msg.role !== "assistant" && msg.role !== "tool") {
        return msg;
    }

    let text = msg.content;

    // Normalize whitespace
    text = text.replace(/\s+/g, " ").trim();

    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    // If short, return unchanged
    if (sentences.length <= 3) {
        return msg;
    }
    // Keep first 2 + last 1 sentences
    const reduced = [
        sentences[0],
        sentences[1],
        sentences[sentences.length - 1],
    ].join(" ");

    return {
        ...msg,
        content: reduced,
        meta: { ...(msg.meta ?? {}), reduced: true },
    };
}
/**
 * Apply reduction to all messages in the final output.
 */

export function applyOutputReduction(messages: SMAGEMessage[]): SMAGEMessage[] {
    return messages.map(reduceOutput);
}
