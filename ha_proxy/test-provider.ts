import { callProvider } from "../ha_core/call/providers";
import { msg } from "../ha_core/index";

async function main() {
    const messages = [
        msg({ role: "user", content: "hello" }),
        msg({ role: "assistant", content: "response" }),
    ];

    const result = await callProvider("openai", messages, "gpt-4o-mini", {
        maxTokens: 200,
    });

    console.log("provider result:", result);
}

main();
