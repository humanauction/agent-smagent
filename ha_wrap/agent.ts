import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { SMAGEMCPClient } from "../ha_cli/mcp_client.js";
import { applyCCR } from "../ha_core/transform/ccr.js";
import { reversibleLog } from "../ha_core/cache/log.js";
import { learn } from "../ha_learn/index.js";

export interface SMAGECallInput {
    session: string;
    model: string;
    provider: string;
    messages: SMAGEMessage[];
    options?: (SMAGEOptions & Record<string, unknown>) | undefined;
}

export interface SMAGECallResult {
    role: string;
    content: string;
    durationMs: number;
    empty: boolean;
}

export class SMAGEAgent {
    private mcp: SMAGEMCPClient;

    constructor() {
        this.mcp = new SMAGEMCPClient("node", [
            "--require=ts-node/register",
            "ha_mcp/server.ts",
        ]);
    }

    async call(input: SMAGECallInput): Promise<SMAGECallResult> {
        const { session, model, provider } = input;
        const options = input.options ?? {};
        const originalMessages = input.messages;

        // 1. CCR shaping (anchors, compression, routing-aware transforms)
        const shapedMessages = await applyCCR(
            originalMessages,
            provider,
            session,
            options,
        );

        const start = Date.now();

        // 2. MCP call with shaped messages
        const response = await this.mcp.smageCall(
            session,
            model,
            shapedMessages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            {
                ...options,
                provider,
            },
        );

        const durationMs = Date.now() - start;

        const role = response.result?.role ?? "assistant";
        const content = response.result?.content ?? "";

        const trimmed = content.trim();
        const empty = trimmed === "" || trimmed.includes("[empty response]");

        // 3. Reversible log of full I/O
        reversibleLog(session, "agent_call", {
            provider,
            model,
            request: originalMessages,
            shaped: shapedMessages,
            response: { role, content },
            durationMs,
            ts: Date.now(),
        });

        // 4. Learning ingest (anchors, relevance, provider behaviour)
        learn.ingest({
            session,
            provider,
            model,
            messages: originalMessages,
            response: { role, content },
            ts: Date.now(),
        });

        // 5. Normalized result for orchestrator/multi-agent/blender
        return {
            role,
            content,
            durationMs,
            empty,
        };
    }
}
