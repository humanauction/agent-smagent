import { SMAGEAgent } from "../../ha_wrap/agent";

// this file is the CLI for SMAGEAgent testing

// this function sends a test message to the provider, logs result via MCP
export async function testAgent() {
    const agent = new SMAGEAgent();

    const result = await agent.call({
        messages: [{ role: "user", content: "hello" }],
        provider: "openai",
        model: "gpt-4o-mini",
        session: "test-session",
        options: {},
    });

    console.log(result);
}
