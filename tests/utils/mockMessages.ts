import type { SMAGEMessage } from "../../ha_core/index.js";

export const mockMessageEmpty: SMAGEMessage[] = [];

export const mockMessages: SMAGEMessage[] = [
    { role: "system", content: "System init", meta: {} },
    { role: "user", content: "Hello world", meta: {} },
    { role: "assistant", content: "Hi there!", meta: {} },
];

export const mockMessageShort: SMAGEMessage[] = [
    { role: "user", content: "Hello world", meta: {} },
    { role: "assistant", content: "Hi there!", meta: {} },
];

export const mockMessageMedium: SMAGEMessage[] = [
    { role: "system", content: "System init", meta: {} },
    { role: "user", content: "Hello world", meta: {} },
    { role: "assistant", content: "Hi there!", meta: {} },
    { role: "user", content: "How are you?", meta: {} },
    { role: "assistant", content: "I'm good, thanks!", meta: {} },
];

export const mockMessageLong: SMAGEMessage[] = [
    { role: "system", content: "System init", meta: {} },
    { role: "user", content: "Hello world", meta: {} },
    { role: "assistant", content: "Hi there!", meta: {} },
    { role: "user", content: "How are you?", meta: {} },
    { role: "assistant", content: "I'm good, thanks!", meta: {} },
    { role: "user", content: "What can you do?", meta: {} },
    {
        role: "assistant",
        content: "I can help you with various tasks.",
        meta: {},
    },
    { role: "user", content: "That's great!", meta: {} },
    { role: "assistant", content: "Yes, indeed!", meta: {} },
];
