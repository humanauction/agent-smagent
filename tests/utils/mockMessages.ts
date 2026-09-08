import type { SMAGEMessage } from "../../ha_core/index.js";

export const mockMessages: SMAGEMessage[] = [
    {
        role: "system",
        content: "System init",
        meta: {},
    },
    {
        role: "user",
        content: "Hello world",
        meta: {},
    },
    {
        role: "assistant",
        content: "Hi there!",
        meta: {},
    },
];
