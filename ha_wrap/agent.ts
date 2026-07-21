import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { applyCCR } from "../ha_core/transform/ccr.js";
import { callProvider } from "../ha_core/call/providers/index.js";
import { reversibleLog } from "../ha_core/cache/log.js";

// this file contains a SMAGEAgent class. can be used to call SMAGE providers with CCR applied and logs I/O for debugging, analysis.
export interface AgentCallParams {
    session: string;
    model: string;
    provider: string;
    messages: SMAGEMessage[];
    options?: SMAGEOptions & Record<string, any>;
}

export interface AgentResult {
    role: string;
    content: string;
}

export class SMAGEAgent {
    async call(params: AgentCallParams): Promise<AgentResult> {
        const { session, model, provider, messages, options = {} } = params;

        // 1. Run CCR pipeline
        const shaped = await applyCCR(messages, provider, session, options);

        // 2. Call provider through SMAGE dispatcher
        const response = await callProvider({
            session,
            model,
            messages: shaped,
            options: { ...options, provider },
        });

        // 3. Log reversible I/O
        reversibleLog(session, "agent_call", {
            provider,
            model,
            request: messages,
            shaped,
            response,
            ts: Date.now(),
        });

        // 4. Return normalized agent result
        return {
            role: response.role,
            content: response.content,
        };
    }
}
