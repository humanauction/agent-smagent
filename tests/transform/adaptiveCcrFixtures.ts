import type { SMAGEMessage } from "../../ha_core/index.js";
import type { CCRAnchor } from "../../ha_core/transform/anchor.js";

export interface AdaptiveCcrFixture {
    id: string;
    description: string;
    messages: SMAGEMessage[];
    anchor: CCRAnchor;
    maxTokens: number;
}

const pivot: SMAGEMessage = {
    role: "user",
    content: "Continue with the current task.",
    meta: {},
};

export const adaptiveCcrFixtures: AdaptiveCcrFixture[] = [
    {
        id: "debug-tool-retention",
        description: "Debug intent promotes diagnostic tool output.",
        messages: [
            {
                role: "tool",
                content: "Error: stack trace from the failed request.",
                meta: { relevance: 0.2, provider: "openai" },
            },
        ],
        anchor: { lastUser: pivot, intent: "debug" },
        maxTokens: 100,
    },
    {
        id: "testing-message-retention",
        description: "Testing intent promotes test-related context.",
        messages: [
            {
                role: "user",
                content: "The vitest regression is failing.",
                meta: { relevance: 0.2, provider: "openai" },
            },
        ],
        anchor: { lastUser: pivot, intent: "testing" },
        maxTokens: 100,
    },
    {
        id: "explain-assistant-retention",
        description: "Explain intent promotes assistant explanations.",
        messages: [
            {
                role: "assistant",
                content: "Here is the explanation of the trade-off.",
                meta: { relevance: 0.2, provider: "openai" },
            },
        ],
        anchor: { lastUser: pivot, intent: "explain" },
        maxTokens: 100,
    },
    {
        id: "deep-provider-budget",
        description: "Deep adaptive models receive a larger context budget.",
        messages: [
            {
                role: "user",
                content: "Retain this context.",
                meta: {
                    relevance: 0.2,
                    provider: "openai",
                    depth: 0.8,
                },
            },
            {
                role: "user",
                content: "Retain this additional context.",
                meta: {
                    relevance: 0.2,
                    provider: "openai",
                    depth: 0.8,
                },
            },
        ],
        anchor: { lastUser: pivot },
        maxTokens: 6,
    },
];
