import * as smage from "../ha_core/index";
import { cacheGet } from "../ha_core/cache/store";

const msgs: smage.SMAGEMessage[] = [];

for (let i = 0; i < 10; i++) {
    msgs.push({ role: "assistant", content: "assistant " + i });
    msgs.push({ role: "user", content: "user " + i });
    msgs.push({ role: "tool", content: "tool " + i });
    msgs.push({ role: "assistant", content: "assistant " + i });
}
// const longText = Array(300).fill("tool-output").join(" ");
const compressed = await smage.compress({
    messages: msgs,
    agent: "copilot",
    session: "abc123",
    options: { maxTokens: 200 },
});

console.log("compressed", compressed);
console.log("cache", cacheGet("abc123", 1));
