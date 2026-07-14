import type { AgentCallParams, AgentResult } from "./types";
import { MCPClient } from "./mcp-client";
import { callProvider } from "../ha_core/call/providers";
import type { SMAGEOptions } from "../ha_core/index";
import { reversibleLog } from "../ha_core/cache/log";

// this file is the main entry point for the agent wrapper, which handles calls to the MCP and provider
export class SMAGEAgent {
    private mcp: MCPClient;

    constructor() {
        this.mcp = new MCPClient("node", [
            "--require=ts-node/register",
            "ha_mcp/server.ts",
        ]);

        reversibleLog("agent", "mcp_start", {
            server: "ha_mcp/server.ts",
        });
    }

    async call(params: AgentCallParams): Promise<AgentResult> {
        const { messages, provider, model, session } = params;
        const smageOptions = (params.options ?? {}) as SMAGEOptions;

        // 1. Run CCR via MCP
        const shaped = await this.mcp.call("humanAuction_compress", {
            messages,
            agent: provider,
            session,
            options: smageOptions,
        });

        reversibleLog(session, "mcp_compress", {
            messages_in: messages,
            messages_out: shaped.messages,
            stats: shaped.stats,
        });

        // 2. Call provider with shaped messages
        const result = await callProvider(shaped.messages);

        reversibleLog(session, "provider_call", {
            provider,
            model,
            result,
        });

        // 3. Log via MCP
        const retrieve = await this.mcp.call("humanAuction_retrieve", {
            session,
        });

        reversibleLog(session, "mcp_retrieve", retrieve);

        return {
            role: result.role,
            content: result.content,
        };
    }
}
