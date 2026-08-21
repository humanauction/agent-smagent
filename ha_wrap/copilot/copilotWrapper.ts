// ha_wrap/copilot/copilotWrapper.ts

import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index.js";
import { BaseWrapper } from "../shared/baseWrapper.js";
import { reversibleLog } from "../../ha_core/cache/log.js";
import { mapProviderRole } from "../../ha_core/call/providers/roles.js";
import { SMAGEOrchestrator } from "../orchestrator.js";

/**
 * Copilot persona + rules.
 */
const COPILOT_PERSONA = `
You are Copilot, a friendly, fast, pragmatic coding assistant.
You help users write, debug, and refactor code with clarity and precision.
You prefer concise answers unless asked for detail.
You avoid hallucinations and stick to the provided context.
`;

const COPILOT_RULES = `
Always generate correct, runnable code.
Avoid unnecessary abstractions unless requested.
Never invent APIs or libraries that do not exist.
Ask clarifying questions when the user's intent is unclear.
`;

export const CopilotAgents = [
    {
        id: "copilot-openai-mini",
        provider: "openai",
        model: "gpt-4o-mini",
        speed: 1.0,
        cost: 0.7,
        depth: 0.8,
        quality: 0.9,
        options: { fallback: "anthropic" },
    },
    {
        id: "copilot-anthropic-haiku",
        provider: "anthropic",
        model: "claude-3-haiku",
        speed: 1.1,
        cost: 0.6,
        depth: 0.7,
        quality: 0.85,
        options: { fallback: "openai" },
    },
];

/**
 * CopilotWrapper
 * Extends BaseWrapper and implements provider call via OpenAIAdapter.
 */
export class CopilotWrapper extends BaseWrapper {
    constructor() {
        super({
            id: "copilot",
            persona: COPILOT_PERSONA,
            rules: COPILOT_RULES,
            tools: [],
            memory: [],
        });
    }

    async callProvider(
        session: string,
        messages: SMAGEMessage[],
        options: SMAGEOptions,
    ): Promise<SMAGEMessage[]> {
        reversibleLog(session, "wrapper_provider_request", {
            wrapper: "copilot",
            messages,
        });

        const orchestrator = new SMAGEOrchestrator({
            session,
            strategy: options.strategy ?? "auto",
            agents: CopilotAgents,
        });

        const result = await orchestrator.orchestrate(messages);

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "copilot",
            response: result,
        });

        return [
            {
                role: mapProviderRole(result.role),
                content: result.content,
                meta: { provider: result.agentId },
            },
        ];
    }
}
