import type { SMAGEMessage } from '../index.js';
// multi‑agent compression pipeline

/**
 * Memory entry:
 * - key: string (agent or global)
 * - value: string (fact, summary, preference)
 * - ts: timestamp
 */
export interface MemoryEntry {
    key: string;
    value: string;
    ts: number;
}

/**
 * In-memory store (TODO: embeddings, external storage, database e.g. replace with Redis/SQLite)
 */
const MEMORY = new Map<string, MemoryEntry>();

/**
 * Normalize memory keys:
 * - agent-specific: "agent:<agent>"
 * - global: "global"
 */
function keyFor(agent: string, field: string): string {
    return `${agent}:${field}`;
}

/**
 * Store a memory entry
 */
export function remember(agent: string, field: string, value: string): void {
    const key = keyFor(agent, field);
    MEMORY.set(key, { key, value, ts: Date.now() });
}

/**
 * Retrieve a memory entry
 */
export function recall(agent: string, field: string): string | undefined {
    const key = keyFor(agent, field);
    return MEMORY.get(key)?.value;
}

/**
 * Extract memory-worthy facts from messages
 * - user preferences
 * - tool results
 * - assistant statements
 * - system instructions
 */
export function mineMemory(messages: SMAGEMessage[], agent: string): void {
    for (const msg of messages) {
        if (msg.role === "system") {
            remember(agent, "system", msg.content);
        }

        if (msg.role === "user") {
            if (msg.content.toLowerCase().includes("i like")) {
                remember(agent, "user:likes", msg.content);
            }
            if (msg.content.toLowerCase().includes("my name is")) {
                remember(agent, "user:name", msg.content);
            }
        }

        if (msg.role === "assistant") {
            if (msg.content.length > 200) {
                remember(agent, "assistant:lastSummary", msg.content);
            }
        }

        if (msg.role === "tool") {
            if (msg.meta?.result === true) {
                remember(agent, "tool:lastResult", msg.content);
            }
        }
    }
}

/**
 * Inject memory back into the context
 */
export function injectMemory(agent: string): SMAGEMessage[] {
    const msgs: SMAGEMessage[] = [];

    const system = recall(agent, "system");
    if (system) msgs.push({ role: "system", content: system });

    const name = recall(agent, "user:name");
    if (name) msgs.push({ role: "assistant", content: `User name: ${name}` });

    const likes = recall(agent, "user:likes");
    if (likes)
        msgs.push({ role: "assistant", content: `User preference: ${likes}` });

    const summary = recall(agent, "assistant:lastSummary");
    if (summary)
        msgs.push({
            role: "assistant",
            content: `Previous summary: ${summary}`,
        });

    const toolResult = recall(agent, "tool:lastResult");
    if (toolResult)
        msgs.push({
            role: "assistant",
            content: `Last tool result: ${toolResult}`,
        });

    return msgs;
}
