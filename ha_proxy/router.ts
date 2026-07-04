import type { Request, Response } from "express";
import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index";
import { callProvider } from "../ha_core/call/providers";
import { cacheAppend, cachePut } from "../ha_core/cache/store";
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

    cachePut("session", {
        stage: "original",
        messages: smageMessages,
        provider,
        model,
        options: smageOptions,
    });

    const shaped = await applyCCR(
        smageMessages,
        provider,
        "session",
        smageOptions,
    );

    cacheAppend("session", {
        stage: "shaped",
        messages: shaped,
    });

    const result = await callProvider({
        session: "session",
        model,
        messages: shaped,
        options: { ...smageOptions, provider },
    });

    cacheAppend("session", {
        stage: "provider_response",
        message: result,
    });

    return res.json({
        id: "smage-proxy-response",
        object: "chat.completion",
        choices: [{ message: result }],
    });
}
