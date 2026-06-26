import * as smage from "../ha_core/index";

const compressed = await smage.compress({
    messages: [
        { role: "user", content: "hi" },
        { role: "tool", content: "very long tool output ...", meta: {} },
    ],
    agent: "copilot",
    session: "abc123",
});

console.log("compressed", compressed);
