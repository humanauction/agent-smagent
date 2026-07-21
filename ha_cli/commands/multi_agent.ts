import type { SMAGEMessage } from "../../ha_core/index.js";
import { SMAGEMultiAgent } from "../../ha_wrap/multi_agent.js";

// this file contains the implementation of the multi-agent round-robin command for the CLI
export async function runMultiAgentRR(session: string, prompt: string) {
    const messages: SMAGEMessage[] = [
        { role: "user", content: prompt, name: "user", meta: {} },
    ];

    const multi = new SMAGEMultiAgent([
        { id: "openai-fast", provider: "openai", model: "gpt-4o-mini" },
        { id: "anthropic-deep", provider: "anthropic", model: "claude-3-opus" },
    ]);

    const result = await multi.roundRobin(session, messages);

    console.log(JSON.stringify(result, null, 2));
}
