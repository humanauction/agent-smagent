// ha_wrap/aider/aiderWrapper.ts

import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index";
import { BaseWrapper } from "../shared/baseWrapper";

import { LocalAdapter } from "../../ha_core/call/providers/local";
import { reversibleLog } from "../../ha_core/cache/log";
import { mapProviderRole } from "../../ha_core/call/providers/roles";

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

        const response = await LocalAdapter.call({
            session,
            model: options.model ?? "local-code-model",
            messages,
        });

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: "aider",
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
