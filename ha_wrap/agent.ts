import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { SMAGEMCPClient } from "../ha_cli/mcp_client.js";

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
        // You may adjust args depending on how you spawn your MCP server
        this.mcp = new SMAGEMCPClient("node", [
            "--require=ts-node/register",
            "ha_mcp/server.ts",
        ]);
    }

    async call(input: SMAGECallInput): Promise<SMAGECallResult> {
        const start = Date.now();

        const response = await this.mcp.smageCall(
            input.session,
            input.model,
            input.messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            {
                ...(input.options ?? {}),
                provider: input.provider,
            },
        );

        const durationMs = Date.now() - start;

        const role = response.result?.role ?? "assistant";
        const content = response.result?.content ?? "";

        const trimmed = content.trim();
        const empty = trimmed === "" || trimmed.includes("[empty response]");

        return {
            role,
            content,
            durationMs,
            empty,
        };
    }
}
