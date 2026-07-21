import * as readline from "readline";
import process from "process";

import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { applyCCR } from "../ha_core/transform/ccr.js";
import { callProvider, providers } from "../ha_core/call/providers/index.js";
import { reversibleLog } from "../ha_core/cache/log.js";

interface MCPRequest {
    id: string | number;
    method: string;
    params?: any;
}

interface MCPResponse {
    id: string | number;
    result?: any;
    error?: string;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Convert raw MCP messages → SMAGEMessage[]
function toSMAGE(
    messages: Array<{ role: string; content: string }>,
): SMAGEMessage[] {
    return messages.map((m) => ({
        role: m.role as SMAGEMessage["role"],
        content: m.content,
        name: m.role === "assistant" ? "assistant" : (undefined as any),
        meta: {},
    }));
}

// Convert SMAGEMessage → MCP response format
function fromSMAGE(msg: SMAGEMessage) {
    return {
        role: msg.role,
        content: msg.content,
    };
}

async function handleCall(params: any) {
    const {
        session,
        model,
        messages,
        options,
    }: {
        session: string;
        model: string;
        messages: Array<{ role: string; content: string }>;
        options?: SMAGEOptions & { provider?: string };
    } = params;

    const providerName = options?.provider ?? "openai";

    const smageMessages = toSMAGE(messages);

    // Run CCR pipeline
    const shaped = await applyCCR(
        smageMessages,
        providerName,
        session,
        options ?? {},
    );

    // Call provider
    const response = await callProvider({
        session,
        model,
        messages: shaped,
        options: { ...(options ?? {}), provider: providerName },
    });

    reversibleLog(session, "mcp_call", {
        provider: providerName,
        model,
        request: messages,
        response,
        ts: Date.now(),
    });

    return fromSMAGE({
        role: "assistant",
        content: response.content,
        name: "assistant",
        meta: {},
    });
}

async function handleProviders() {
    return Object.keys(providers);
}

async function handleModels(params: any) {
    const providerName = params?.provider ?? "openai";

    // TODO: dynamic model listing per provider
    return ["default", "gpt-4o-mini", "claude-3-haiku", "gemini-pro"];
}

rl.on("line", async (line: string) => {
    let req: MCPRequest;

    try {
        req = JSON.parse(line);
    } catch {
        process.stdout.write(JSON.stringify({ error: "Invalid JSON" }) + "\n");
        return;
    }

    const { method, params, id } = req;

    try {
        let result;

        if (method === "smage.call") {
            result = await handleCall(params);
        } else if (method === "smage.providers") {
            result = await handleProviders();
        } else if (method === "smage.models") {
            result = await handleModels(params);
        } else {
            result = { error: `Unknown method: ${method}` };
        }

        const res: MCPResponse = { id, result };
        process.stdout.write(JSON.stringify(res) + "\n");
    } catch (err: any) {
        const res: MCPResponse = {
            id,
            error: String(err?.message ?? err),
        };
        process.stdout.write(JSON.stringify(res) + "\n");
    }
});
