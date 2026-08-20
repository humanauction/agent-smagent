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

    // Build orchestrator config
    const orchestrator = new SMAGEOrchestrator({
        session,
        strategy: options.strategy ?? "auto",
        agents: [
            {
                id: provider ?? "openai",
                provider: provider ?? "openai",
                model,
                speed: 1,
                cost: 1,
                depth: 1,
                quality: 1,
                options,
            },
        ],
    });

    try {
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
