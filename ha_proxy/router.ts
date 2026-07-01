import type { Request, Response } from "express";
import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index";
import { callProvider } from "../ha_core/call/providers";
import { cacheAppend, cachePut } from "../ha_core/cache/store";
import { applyCCR } from "../ha_core/transform/ccr";

// this file converts provider‑style messages → SMAGEMessage → CCR → provider → response
function toSMAGE(messages: any[]): SMAGEMessage[] {
    return messages.map((m) => ({
        role: m.role,
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

    // Reversible Logging checkpoint 1: Store the shaped messages in cache for debugging
    cachePut("session", {
        stage: "original",
        messages: smageMessages,
        provider,
        model,
        options: smageOptions,
    });

    // run CCR
    const shaped = await applyCCR(
        smageMessages,
        provider,
        "session",
        smageOptions,
    );

    // check 2 - shaped messages after contextManager before provider
    cacheAppend("session", {
        stage: "shaped",
        messages: shaped,
    });

    // Call Provider
    const result = await callProvider(provider, shaped, model, smageOptions);

    // Checkpoint 3 — provider response
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
