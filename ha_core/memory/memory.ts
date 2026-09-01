import type { SMAGEMessage } from "../index.js";
import { CCRAnchor } from "../transform/anchor.js";
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

// persistent memory anchor

export interface AnchorMemory {
    agent: string;
    session: string;
    summary: string;
    lastUser?: string;
    lastAssistant?: string;
    topicHint?: string;
    createdAt: number;
}

/**
 * In-memory store (TODO: embeddings, external storage, database e.g. replace with Redis/SQLite)
 */
const MEMORY = new Map<string, MemoryEntry>();

/**
 * Anchor memory store
 */
const ANCHOR_MEMORY_STORE: AnchorMemory[] = [];

/**
 * Normalize memory keys:
 * - agent-specific: "agent:<agent>"
 * - global: "global"
 */
function keyFor(agent: string, field: string): string {
    return `${agent}:${field}`;
}

export function rememberAnchor(
    agent: string,
    session: string,
    anchor: CCRAnchor,
): void {
    const pivot = anchor.lastUser ?? anchor.lastAssistant ?? anchor.system;
    if (!pivot) return;

    const summary = pivot.content.slice(0, 256);
    ANCHOR_MEMORY_STORE.push({
        agent,
        session,
        summary,
        lastUser: anchor.lastUser?.content,
        lastAssistant: anchor.lastAssistant?.content,
        topicHint: anchor.summaryHint ?? undefined,
        createdAt: Date.now(),
    });
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
    const base: SMAGEMessage[] = [];

    // Add recent anchors
    const anchors = ANCHOR_MEMORY_STORE.filter((m) => m.agent === agent)
        .slice(-5) // last few anchors only
        .map<SMAGEMessage>((am) => {
            const ageMs = Date.now() - am.createdAt;
            const days = ageMs / (1000 * 60 * 60 * 24);
            const relevance = Math.min(0.3, 0.8 - days * 0.05); // decay relevance over time
            return {
                role: "system",
                content: `Previous anchor: ${am.summary}
            Last user: ${am.lastUser ?? "none"}
            Last assistant: ${am.lastAssistant ?? "none"}
            Topic hint: ${am.topicHint ?? "none"}
            Relevance: ${relevance.toFixed(2)}
            `,
                meta: {
                    anchor: true,
                    memory: true,
                    priority: 3,
                    relevance,
                },
            };
        });

    base.push(...anchors);

    const system = recall(agent, "system");
    if (system) base.push({ role: "system", content: system });

    const name = recall(agent, "user:name");
    if (name) base.push({ role: "assistant", content: `User name: ${name}` });

    const likes = recall(agent, "user:likes");
    if (likes)
        base.push({ role: "assistant", content: `User preference: ${likes}` });

    const summary = recall(agent, "assistant:lastSummary");
    if (summary)
        base.push({
            role: "assistant",
            content: `Previous summary: ${summary}`,
        });

    const toolResult = recall(agent, "tool:lastResult");
    if (toolResult)
        base.push({
            role: "assistant",
            content: `Last tool result: ${toolResult}`,
        });

    return base;
}
