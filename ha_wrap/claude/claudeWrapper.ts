import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index.js";
import { BaseWrapper } from "../shared/baseWrapper.js";

import { AnthropicAdapter } from "../../ha_core/call/providers/anthropic.js";
import { reversibleLog } from "../../ha_core/cache/log.js";
import { mapProviderRole } from "../../ha_core/call/providers/roles.js";
import { SMAGEOrchestrator } from "../orchestrator.js";

/**
 * Claude persona + rules.
 * These will be injected as system anchors with meta.anchor = true.
 */
const CLAUDE_PERSONA = `
You are Claude, an analytical, careful, helpful assistant.
You avoid hallucinations.
You cite sources when appropriate.
You ask clarifying questions when needed.
You provide structured reasoning.
`;

const CLAUDE_RULES = `
Always be precise and cautious.
Never fabricate facts.
Never execute unsafe code.
Always explain your reasoning clearly.
`;

export const ClaudeAgents = [
    {
        id: "claude-sonnet",
        provider: "anthropic",
        model: "claude-3-sonnet",
        speed: 0.8,
        cost: 0.7,
        depth: 0.95,
        quality: 0.95,
        options: { fallback: "openai" },
    },
    {
        id: "claude-haiku",
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
 * ClaudeWrapper
 * Extends BaseWrapper and implements provider call via AnthropicAdapter.
 */
export class ClaudeWrapper extends BaseWrapper {
    constructor() {
        super({
            id: "claude",
            persona: CLAUDE_PERSONA,
            rules: CLAUDE_RULES,
            tools: [], // TODO:Claude-specific tools
            memory: [], // TODO: Wrapper-specific memory anchors
        });
    }

    /**
     * Provider call for Claude.
     * Uses AnthropicAdapter from ha_core.
     */
    async callProvider(
        session: string,
        messages: SMAGEMessage[],
        options: SMAGEOptions,
    ): Promise<SMAGEMessage[]> {
        reversibleLog(session, "wrapper_provider_request", {
            wrapper: "claude",
            messages,
        });

        const orchestrator = new SMAGEOrchestrator({
            session,
            strategy: options.strategy ?? "single",
            agents: ClaudeAgents,
        });

        const result = await orchestrator.orchestrate(messages);

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "claude",
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
