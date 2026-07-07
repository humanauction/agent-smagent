import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index";
import { BaseWrapper } from "../shared/baseWrapper";

import { AnthropicAdapter } from "../../ha_core/call/providers/anthropic";
import { reversibleLog } from "../../ha_core/cache/log";
import { mapProviderRole } from "../../ha_core/call/providers/roles";

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

        const response = await AnthropicAdapter.call({
            session,
            model: options.model ?? "claude-3-sonnet",
            messages,
        });

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "claude",
            response,
        });

        return [
            {
                role: mapProviderRole(response.role),
                content: response.content,
                meta: { provider: "anthropic" },
            },
        ];
    }
}
