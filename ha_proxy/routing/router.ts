import type { Request, Response } from "express";
import { applyCCR } from "../../ha_core/transform/ccr.js";
import { reversibleLog } from "../../ha_core/cache/log.js";
import {
    providerError,
    isProviderError,
} from "../../ha_core/call/providers/errors.js";
import { SMAGEOrchestrator } from "../../ha_wrap/orchestrator.js";
import type { SMAGEMessage } from "../../ha_core/index.js";

export async function routeLLM(req: Request, res: Response) {
    const { model, messages, provider, wrapper, options = {} } = req.body;

    if (!model || !messages) {
        return res.status(400).json({ error: "Missing model or messages" });
    }

    const session = "session"; // TODO: real session id

    // Convert incoming messages → SMAGEMessage
    const smageMessages: SMAGEMessage[] = messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        meta: {},
    }));

    // CCR shaping
    const shaped = await applyCCR(
        smageMessages,
        provider ?? "openai",
        session,
        options,
    );

    reversibleLog(session, "raw", { provider, model, messages, options });
    reversibleLog(session, "shaped", shaped);

    // Multi-agent config (fan-out ready)
    const agents = [
        {
            id: "openai-main",
            provider: "openai",
            model,
            speed: 1.0,
            cost: 0.7,
            depth: 0.8,
            quality: 0.95,
            options,
        },
        {
            id: "anthropic-backup",
            provider: "anthropic",
            model: "claude-3-opus",
            speed: 0.8,
            cost: 0.8,
            depth: 0.9,
            quality: 0.97,
            options,
        },
        {
            id: "google-spec",
            provider: "google",
            model: "gemini-2.0-pro",
            speed: 1.1,
            cost: 0.6,
            depth: 0.7,
            quality: 0.9,
            options,
        },
    ];

    // Construct orchestrator
    const orchestrator = new SMAGEOrchestrator({
        session,
        strategy: options.strategy ?? "auto",
        agents,
    });

    try {
        // Use the real orchestrator API
        const result = await orchestrator.orchestrate(shaped);

        reversibleLog(session, "provider_response", result);

        return res.json({
            id: "smage-proxy-response",
            object: "chat.completion",
            choices: [
                {
                    message: {
                        role: "assistant",
                        content: result.content,
                    },
                },
            ],
        });
    } catch (err) {
        if (isProviderError(err)) {
            return res.status(502).json({
                error: "ProviderError",
                detail: err,
            });
        }

        const pe = providerError(
            "internal",
            provider ?? "unknown",
            model,
            session,
            String((err as any)?.message ?? err),
            err,
        );

        return res.status(500).json({
            error: "InternalError",
            detail: pe,
        });
    }
}
