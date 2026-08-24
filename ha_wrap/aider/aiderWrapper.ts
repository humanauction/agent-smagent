// ha_wrap/aider/aiderWrapper.ts

import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index.js";
import { BaseWrapper } from "../shared/baseWrapper.js";

import { LocalAdapter } from "../../ha_core/call/providers/local.js";
import { reversibleLog } from "../../ha_core/cache/log.js";
import { mapProviderRole } from "../../ha_core/call/providers/roles.js";
import { SMAGEOrchestrator } from "../orchestrator.js";

/**
 * Aider persona + rules.
 * These will be injected as system anchors with meta.anchor = true.
 */
const AIDER_PERSONA = `
You are Aider, a code-editing assistant.
You specialise in patch generation, diffs, refactors, and safe code transformations.
You always produce minimal, correct, reversible edits.
You never hallucinate code.
You always ask for clarification when the user's intent is ambiguous.
`;

const AIDER_RULES = `
Always generate patches using minimal diffs.
Never rewrite entire files unless explicitly requested.
Always preserve user formatting unless instructed otherwise.
Never invent APIs or functions that do not exist.
Always show the diff or patch clearly.
`;

export const AiderAgents = [
    {
        id: "aider-local",
        provider: "local",
        model: "local-llm",
        speed: 1.2,
        cost: 0.1,
        depth: 0.6,
        quality: 0.7,
        options: { fallback: "openai" },
    },
    {
        id: "aider-openai-mini",
        provider: "openai",
        model: "gpt-4o-mini",
        speed: 1.0,
        cost: 0.7,
        depth: 0.8,
        quality: 0.9,
        options: { fallback: "local" },
    },
];

/**
 * AiderWrapper
 * Extends BaseWrapper and implements provider call via LocalAdapter.
 */
export class AiderWrapper extends BaseWrapper {
    constructor() {
        super({
            id: "aider",
            persona: AIDER_PERSONA,
            rules: AIDER_RULES,
            tools: [], // TODO: Aider-specific tools (patch, diff, edit)
            memory: [], // TODO: Wrapper-specific memory anchors
        });
    }

    /**
     * Provider call for Aider.
     * Uses LocalAdapter from ha_core.
     */
    async callProvider(
        session: string,
        messages: SMAGEMessage[],
        options: SMAGEOptions,
    ): Promise<SMAGEMessage[]> {
        reversibleLog(session, "wrapper_provider_request", {
            wrapper: "aider",
            messages,
        });

        const orchestrator = new SMAGEOrchestrator({
            session,
            strategy: options.strategy ?? "round_robin",
            agents: AiderAgents,
        });

        const result = await orchestrator.orchestrate(messages);

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "aider",
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
