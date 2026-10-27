import type { SMAGEMessage } from "../../ha_core/index.js";

export interface RelevanceTierFixture {
    id: string;
    description: string;
    maxTokens: number;
    messages: SMAGEMessage[];
    requiredPhrases: string[];
}

interface FixtureMessage {
    id: string;
    role: SMAGEMessage["role"];
    content: string;
    priority: number;
    relevance: number;
}

function message(spec: FixtureMessage): SMAGEMessage {
    return {
        role: spec.role,
        content: spec.content,
        meta: {
            fixtureMessageId: spec.id,
            priority: spec.priority,
            relevance: spec.relevance,
        },
    };
}

function repeatedMessages(
    prefix: string,
    count: number,
    priority: number,
    relevance: number,
): FixtureMessage[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `${prefix}-${index + 1}`,
        role: "user" as const,
        content: `${prefix} ${index + 1}`,
        priority,
        relevance,
    }));
}

export const relevanceTierFixtures: RelevanceTierFixture[] = [
    {
        id: "long-history-high-tier-tail",
        description:
            "A one-token remainder is spent on medium context while a two-token high-priority fact is skipped by the 70% phase cutoff.",
        maxTokens: 10,
        requiredPhrases: ["Launch Cedar"],
        messages: [
            message({
                id: "older-project-context",
                role: "assistant",
                content: "Project context from earlier planning remains important today",
                priority: 3,
                relevance: 0.95,
            }),
            message({
                id: "release-fact",
                role: "user",
                content: "Launch Cedar",
                priority: 3,
                relevance: 0.9,
            }),
            ...repeatedMessages("medium-detail", 10, 2, 0.5).map(message),
            ...repeatedMessages("older-aside", 8, 1, 0.2).map(message),
        ],
    },
    {
        id: "long-history-multiple-critical-facts",
        description:
            "Several high-priority facts compete with medium-tier filler after the baseline's high-tier phase cutoff.",
        maxTokens: 14,
        requiredPhrases: ["Window Friday", "Owner Maya"],
        messages: [
            message({
                id: "older-rollout-context",
                role: "assistant",
                content: "Older operational notes still describe the current staged rollout plan",
                priority: 3,
                relevance: 0.98,
            }),
            message({
                id: "window-fact",
                role: "user",
                content: "Window Friday",
                priority: 3,
                relevance: 0.9,
            }),
            message({
                id: "owner-fact",
                role: "user",
                content: "Owner Maya",
                priority: 3,
                relevance: 0.88,
            }),
            ...repeatedMessages("medium-status", 9, 2, 0.55).map(message),
            ...repeatedMessages("low-history", 6, 1, 0.2).map(message),
        ],
    },
    {
        id: "long-history-no-cutoff-pressure",
        description:
            "Control case where the high tier fits below the phase cutoff and the policies should select the same context.",
        maxTokens: 20,
        requiredPhrases: ["Pilot Cedar"],
        messages: [
            message({
                id: "rollout-context",
                role: "assistant",
                content: "Maintain the agreed rollout plan for the next release",
                priority: 3,
                relevance: 0.95,
            }),
            message({
                id: "pilot-fact",
                role: "user",
                content: "Pilot Cedar",
                priority: 3,
                relevance: 0.9,
            }),
            ...repeatedMessages("medium-checkpoint", 8, 2, 0.5).map(message),
            ...repeatedMessages("low-background", 8, 1, 0.2).map(message),
        ],
    },
];
