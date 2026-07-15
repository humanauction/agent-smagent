// ha_wrap/copilot/copilotWrapper.ts

import type { SMAGEMessage, SMAGEOptions } from '../../ha_core/index.js';
import { BaseWrapper } from '../shared/baseWrapper.js';

import { OpenAIAdapter } from '../../ha_core/call/providers/openai.js';
import { reversibleLog } from '../../ha_core/cache/log.js';
import { mapProviderRole } from '../../ha_core/call/providers/roles.js';

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
            tools: [], // TODO: Copilot-specific tools
            memory: [], // TODO: Wrapper-specific memory anchors
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

        const response = await OpenAIAdapter.call({
            session,
            model: options.model ?? "gpt-4o-mini",
            messages,
        });

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "copilot",
            response,
        });

        return [
            {
                role: mapProviderRole(response.role),
                content: response.content,
                meta: { provider: "openai" },
            },
        ];
    }
}
