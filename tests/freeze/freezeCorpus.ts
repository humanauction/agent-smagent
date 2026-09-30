import type { SMAGEMessage } from "../../ha_core/index.js";

export interface FreezeCorpusCase {
    id: string;
    category: string;
    messages: SMAGEMessage[];
    mustRetain?: string[];
}

// Fixed, offline inputs. Keep IDs stable so benchmark results remain traceable.
export const freezeCorpus: FreezeCorpusCase[] = [
    {
        id: "minimal-two-turn",
        category: "minimal",
        mustRetain: ["Define context compression"],
        messages: [
            { role: "user", content: "Define context compression.", meta: {} },
            { role: "assistant", content: "It reduces prompt size while retaining useful context.", meta: {} },
        ],
    },
    {
        id: "system-instructions",
        category: "instruction-heavy",
        mustRetain: ["plain English", "under five sentences"],
        messages: [
            { role: "system", content: "Answer in plain English. Preserve the stated constraints and explain uncertainty.", meta: {} },
            { role: "user", content: "Compare the options and keep the answer under five sentences.", meta: {} },
            { role: "assistant", content: "I will compare them briefly and state any uncertainty.", meta: {} },
            { role: "user", content: "Also include the main trade-off.", meta: {} },
        ],
    },
    {
        id: "repeated-content",
        category: "repetition",
        mustRetain: ["cache expires after ten minutes"],
        messages: [
            { role: "user", content: "The cache expires after ten minutes. Remember: the cache expires after ten minutes.", meta: {} },
            { role: "assistant", content: "The cache expires after ten minutes.", meta: {} },
            { role: "user", content: "Please confirm the cache expires after ten minutes.", meta: {} },
        ],
    },
    {
        id: "long-multi-topic",
        category: "long-context",
        mustRetain: ["12 by 8 metre", "wheelchair user"],
        messages: [
            { role: "system", content: "Help plan a small community garden project.", meta: {} },
            { role: "user", content: "We have a sunny 12 by 8 metre plot and six volunteers.", meta: {} },
            { role: "assistant", content: "That supports several beds with room for paths.", meta: {} },
            { role: "user", content: "We want tomatoes, beans, herbs, and a compost area.", meta: {} },
            { role: "assistant", content: "Keep taller crops on the north side and place compost near access.", meta: {} },
            { role: "user", content: "Two volunteers can only work on weekends.", meta: {} },
            { role: "assistant", content: "Schedule heavier shared tasks for weekends.", meta: {} },
            { role: "user", content: "Water is available at the south-west corner.", meta: {} },
            { role: "assistant", content: "A main path from that corner can simplify watering.", meta: {} },
            { role: "user", content: "Keep the plan accessible for a wheelchair user.", meta: {} },
        ],
    },
    {
        id: "structured-config",
        category: "structured-data",
        mustRetain: ["timeout_ms", "1200"],
        messages: [
            { role: "user", content: "Review this config: {\"retries\":3,\"timeout_ms\":1200,\"fallback\":true}. Keep the exact values.", meta: {} },
            { role: "assistant", content: "The config sets three retries, a 1200 ms timeout, and enables fallback.", meta: {} },
        ],
    },
    {
        id: "code-snippet",
        category: "code",
        mustRetain: ["Math.min(max, Math.max(min, n))"],
        messages: [
            { role: "user", content: "Explain this function without changing its behavior: function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }", meta: {} },
            { role: "assistant", content: "It bounds n to the inclusive range from min to max.", meta: {} },
        ],
    },
    {
        id: "constraints-and-exceptions",
        category: "constraints",
        mustRetain: ["No car", "avoid stairs", "£40", "18:00"],
        messages: [
            { role: "user", content: "Plan a one-day visit. No car, avoid stairs, budget £40, and leave by 18:00.", meta: {} },
            { role: "assistant", content: "I will use public transport, step-free routes, stay within budget, and finish before 18:00.", meta: {} },
            { role: "user", content: "If a route is not confirmed step-free, mark it as uncertain.", meta: {} },
        ],
    },
    {
        id: "anchor-recall",
        category: "cross-turn-reference",
        mustRetain: ["Cedar", "12 October"],
        messages: [
            { role: "user", content: "Our release codename is Cedar. The deadline is 12 October.", meta: {} },
            { role: "assistant", content: "Noted: Cedar, due 12 October.", meta: {} },
            { role: "user", content: "The team has four engineers and no release manager.", meta: {} },
            { role: "assistant", content: "Assign release coordination explicitly among the four engineers.", meta: {} },
            { role: "user", content: "What is the codename and deadline?", meta: {} },
        ],
    },
];
