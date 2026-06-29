import * as smage from "../ha_core/index.js";
import { msg } from "../ha_core/index.js";
// import { cacheGet } from "../ha_core/cache/store";

const longToolOutput = Array(300).fill("tool-output").join(" ");

const messages = [
    msg({ role: "system", content: "system instructions" }),
    msg({ role: "user", content: "hello" }),
    msg({ role: "assistant", content: "response" }),
    msg({ role: "tool", content: longToolOutput, meta: {} }),
    msg({ role: "assistant", content: "another response" }),
];

const compressed = await smage.compress({
    messages,
    agent: "copilot",
    session: "abc123",
    options: { maxTokens: 200 },
});

console.log("compressed", compressed);
// console.log("cache", cacheGet("abc123", 1));
