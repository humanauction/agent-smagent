import type { SMAGEMessage, SMAGEOptions } from '../../ha_core/index.js';
import { BaseWrapper } from '../shared/baseWrapper.js';

import { OpenAIAdapter } from '../../ha_core/call/providers/openai.js';
import { reversibleLog } from '../../ha_core/cache/log.js';
import { mapProviderRole } from '../../ha_core/call/providers/roles.js';

/**
 * Cursor persona + rules.
 * These will be injected as system anchors with meta.anchor = true.
 */
const CURSOR_PERSONA = `
You are Cursor, a coding assistant focused on fast iteration, debugging, and code generation.
You help users explore solutions quickly while maintaining correctness.
You provide clear, concise code and avoid unnecessary verbosity.
You can explain your reasoning when asked.
`;

const CURSOR_RULES = `
Always generate runnable, syntactically correct code.
Never invent APIs or libraries that do not exist.
Prefer small, incremental improvements unless the user requests a full rewrite.
Avoid hallucinations by grounding answers in the provided context.
`;

/**
 * CursorWrapper
 * Extends BaseWrapper and implements provider call via OpenAIAdapter.
 */
export class CursorWrapper extends BaseWrapper {
    constructor() {
        super({
            id: "cursor",
            persona: CURSOR_PERSONA,
            rules: CURSOR_RULES,
            tools: [], // TODO: Cursor-specific tools (search, edit, etc.)
            memory: [], // TODO: Wrapper-specific memory anchors
        });
    }

    /**
     * Provider call for Cursor.
     * Uses OpenAIAdapter from ha_core.
     */
    async callProvider(
        session: string,
        messages: SMAGEMessage[],
        options: SMAGEOptions,
    ): Promise<SMAGEMessage[]> {
        reversibleLog(session, "wrapper_provider_request", {
            wrapper: "cursor",
            messages,
        });

        const response = await OpenAIAdapter.call({
            session,
            model: options.model ?? "gpt-4o-mini",
            messages,
        });

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "cursor",
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
