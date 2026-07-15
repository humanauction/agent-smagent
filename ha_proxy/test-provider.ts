// import { callProvider } from '../ha_core/call/providers.js';
import { msg } from '../ha_core/index.js';
import { SMAGEAgent } from '../ha_wrap/agent.js';

async function main() {
    const agent = new SMAGEAgent();

    const result = await agent.call({
        messages: [msg({ role: "user", content: "hello" })],
        provider: "openai",
        model: "gpt-4o-mini",
        session: "test-session",
        options: {},
    });

    console.log(result);
}

main();
