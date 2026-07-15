// ha_wrap/opencode/opencodeWrapper.ts

import type { SMAGEMessage, SMAGEOptions } from '../../ha_core/index.js';
import { BaseWrapper } from '../shared/baseWrapper.js';

import { LocalAdapter } from '../../ha_core/call/providers/local.js';
import { reversibleLog } from '../../ha_core/cache/log.js';
import { mapProviderRole } from '../../ha_core/call/providers/roles.js';

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

        const response = await LocalAdapter.call({
            session,
            model: options.model ?? "local-code-model",
            messages,
        });

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "opencode",
            response,
        });

        return [
            {
                role: mapProviderRole(response.role),
                content: response.content,
                meta: { provider: "local" },
            },
        ];
    }
}
