import type { Request, Response } from "express";
import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index";
import { callProvider } from "../ha_core/call/providers";
import { reversibleLog } from "../ha_core/cache/log";
import { applyCCR } from "../ha_core/transform/ccr";
import { mapProviderRole } from "../ha_core/call/providers/roles";

// this file converts provider‑style messages → SMAGEMessage → CCR → provider → response
function toSMAGE(messages: any[]): SMAGEMessage[] {
    return messages.map((m) => ({
        role: mapProviderRole(m.role),
        content: m.content,
    }));
}

export async function handleLLM(req: Request, res: Response) {
    const { provider, model, messages, options } = req.body;

    if (!provider || !model || !messages) {
        return res.status(400).json({ error: "Missing fields" });
    }

    const smageMessages = toSMAGE(messages);
    const smageOptions = (options ?? {}) as SMAGEOptions;

    const shaped = await applyCCR(
        smageMessages,
        provider,
        "session",
        smageOptions,
    );

    const result = await callProvider({
        session: "session",
        model,
        messages: shaped,
        options: { ...smageOptions, provider },
    });

    reversibleLog("session", "original", {
        provider,
        model,
        messages: smageMessages,
        options: smageOptions,
    });

    reversibleLog("session", "shaped", shaped);

    reversibleLog("session", "provider_response", result);

    return res.json({
        id: "smage-proxy-response",
        object: "chat.completion",
        choices: [{ message: result }],
    });
}
