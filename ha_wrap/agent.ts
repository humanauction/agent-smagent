import { ProviderReliabilityTracker } from "./providerReliability.js";

import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { SMAGEMCPClient } from "../ha_cli/mcp_client.js";
import { applyCCR } from "../ha_core/transform/ccr.js";
import { reversibleLog } from "../ha_core/cache/log.js";
import { learn } from "../ha_learn/index.js";
import { CCRPipeline } from "../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../ha_core/call/providers/chainTelemetry.js";
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
    private tracker = new ProviderReliabilityTracker();

    constructor() {
        this.mcp = new SMAGEMCPClient("node", ["dist/ha_mcp/server.js"]);
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
        let response;
        try {
            response = await this.mcp.smageCall(
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
        } catch (err) {
            this.tracker.record({
                providerId: provider,
                provider,
                model,
                session,
                kind: "error",
                timestamp: Date.now(),
            });
            throw err;
        }

        const durationMs = Date.now() - start;

        if (durationMs > 2000) {
            this.tracker.record({
                providerId: provider,
                provider,
                model,
                session,
                kind: "slow",
                timestamp: Date.now(),
            });
        }

        const role = response.result?.role ?? "assistant";
        const content = response.result?.content ?? "";
        const trimmed = content.trim();
        const empty = trimmed === "" || trimmed.includes("[empty response]");

        if (empty) {
            this.tracker.record({
                providerId: provider,
                provider,
                model,
                session,
                kind: "empty",
                timestamp: Date.now(),
            });
        }

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
    // ---------------------------------------------
    // DEBUG: CCR Anchors + CCR Pipeline Inspection
    // ---------------------------------------------
    getAnchors() {
        return {
            system: "SMAGE Agent System Anchor",
            lastUser: null,
            lastAssistant: null,
            lastTool: null,
        };
    }

    async debugCCR(prompt: string) {
        const telemetry = new ProviderChainTelemetry();
        const pipeline = new CCRPipeline(telemetry);

        const messages: SMAGEMessage[] = [
            { role: "user", content: prompt, meta: {} },
        ];

        const shaped = await pipeline.run("debug-session", messages, {});

        return shaped; // contains metrics + timeline + shaped messages
    }
}
