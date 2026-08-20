import type { Request, Response } from "express";
import { applyCCR } from "../../ha_core/transform/ccr.js";
import { callProvider } from "../../ha_core/call/providers/index.js";
import { reversibleLog } from "../../ha_core/cache/log.js";
import {
    providerError,
    isProviderError,
} from "../../ha_core/call/providers/errors.js";
import { wrapperRegistry } from "../../ha_wrap/wrapperRegistry.js";

// this file defines the routing logic for LLM requests, including CCR shaping and provider calls.
export async function routeLLM(req: Request, res: Response) {
    const { provider, model, messages, options = {} } = req.body;

    if (!model || !messages) {
        return res.status(400).json({ error: "Missing model or messages" });
    }

    // validate wrapper when routing via wrappers
    const wrapper = options.wrapper as string | undefined;
    if (wrapper) {
        try {
            wrapperRegistry.get(wrapper as any);
        } catch {
            return res
                .status(400)
                .json({ error: `Unknown wrapper: ${wrapper}` });
        }
    }

    const session = "session"; // TODO: real session id

    // CCR shaping
    const shaped = await applyCCR(
        messages,
        provider ?? "openai",
        session,
        options,
    );

    reversibleLog(session, "raw", { provider, model, messages, options });
    reversibleLog(session, "shaped", shaped);

    try {
        const response = await callProvider({
            session,
            model,
            messages: shaped,
            options: { ...options, provider },
        });

        reversibleLog(session, "provider_response", response);

        return res.json({
            id: "smage-proxy-response",
            object: "chat.completion",
            choices: [{ message: response }],
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
