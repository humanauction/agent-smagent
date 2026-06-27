import * as smage from "../ha_core/index";
import { cacheGet } from "../ha_core/cache/store";

// const longText = Array(300).fill("tool-output").join(" ");
const compressed = await smage.compress({
    messages: Array.from({ length: 100 }, (_, i) => ({
        role: "assistant",
        content: "message " + i,
    })),
    // messages: [
    //     { role: "user", content: "hi" },
    //     { role: "tool", content: longText, meta: {} },
    // ],
    agent: "copilot",
    session: "abc123",
    options: { maxTokens: 200 },
});

console.log("compressed", compressed);
console.log("cache", cacheGet("abc123", 1));
