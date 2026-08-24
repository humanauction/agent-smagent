// ha_wrap/opencode/opencodeWrapper.ts

import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index.js";
import { BaseWrapper } from "../shared/baseWrapper.js";

import { LocalAdapter } from "../../ha_core/call/providers/local.js";
import { reversibleLog } from "../../ha_core/cache/log.js";
import { mapProviderRole } from "../../ha_core/call/providers/roles.js";
import { SMAGEOrchestrator } from "../orchestrator.js";

/**
 * Opencode persona + rules.
 */
const OPENCODE_PERSONA = `
You are Opencode, an open-source coding assistant.
You focus on transparency, reproducibility, and correctness.
You explain your reasoning when helpful and avoid hidden steps.
You help users understand code deeply, not just generate it.
`;

const OPENCODE_RULES = `
Always provide clear, reproducible code.
Prefer explicitness over magic.
Never hide important implementation details.
Avoid hallucinations by grounding answers in the provided context.
`;

export const OpencodeAgents = [
    {
        id: "opencode-openai",
        provider: "openai",
        model: "gpt-4o-mini",
        speed: 1.0,
        cost: 0.7,
        depth: 0.85,
        quality: 0.9,
        options: { fallback: "google" },
    },
    {
        id: "opencode-google",
        provider: "google",
        model: "gemini-1.5-flash",
        speed: 1.3,
        cost: 0.5,
        depth: 0.7,
        quality: 0.8,
        options: { fallback: "openai" },
    },
];
/**
 * OpencodeWrapper
 * Extends BaseWrapper and implements provider call via LocalAdapter.
 */
export class OpencodeWrapper extends BaseWrapper {
    constructor() {
        super({
            id: "opencode",
            persona: OPENCODE_PERSONA,
            rules: OPENCODE_RULES,
            tools: [], // TODO: Opencode-specific tools
            memory: [], // TODO: Wrapper-specific memory anchors
        });
    }

    async callProvider(
        session: string,
        messages: SMAGEMessage[],
        options: SMAGEOptions,
    ): Promise<SMAGEMessage[]> {
        reversibleLog(session, "wrapper_provider_request", {
            wrapper: "opencode",
            messages,
        });

        const orchestrator = new SMAGEOrchestrator({
            session,
            strategy: options.strategy ?? "fan_out",
            agents: OpencodeAgents,
        });

        const result = await orchestrator.orchestrate(messages);

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "opencode",
            response: result,
        });

        return [
            {
                role: mapProviderRole(result.role),
                content: result.content,
                meta: { result: result.agentId },
            },
        ];
    }
}
