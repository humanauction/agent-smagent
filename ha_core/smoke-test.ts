import * as smage from "../ha_core/index.js";
import { msg } from "../ha_core/index.js";

const longToolOutput = Array(300).fill("tool-output").join(" ");

let messages = [
    msg({ role: "system", content: "system instructions" }),
    msg({ role: "user", content: "hello" }),
    msg({ role: "assistant", content: "response" }),
    msg({ role: "tool", content: longToolOutput, meta: {} }),
    msg({ role: "assistant", content: "another response" }),
];

// Add dedupe + reduction test messages
messages.push(msg({ role: "assistant", content: "response" }));
messages.push(msg({ role: "assistant", content: "response" }));
messages.push(msg({ role: "assistant", content: "response   " }));
messages.push(msg({ role: "assistant", content: "RESPONSE" }));

messages.push(
    msg({
        role: "assistant",
        content:
            "This is a very long assistant message. It contains many sentences. \
             It is verbose and repetitive. It should be reduced. Thank you.",
    }),
);

// NOW run CCR pipeline
const compressed = await smage.compress({
    messages,
    agent: "copilot",
    session: "abc123",
    options: { maxTokens: 200 },
});

console.log("compressed", compressed);
