import type { Request, Response } from "express";
import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index";
import { callProvider } from "../ha_core/call/providers";
import { cachePut } from "../ha_core/cache/store";
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

    // run CCR
    const shaped = await applyCCR(
        smageMessages,
        provider,
        "session",
        smageOptions,
    );

    // Reversible Logging: Store the shaped messages in cache for debugging
    await cachePut("session", {
        original: smageMessages,
        shaped,
        provider,
        model,
        options: smageOptions,
    });

    // Call Provider
    const result = await callProvider(
        provider,
        smageMessages,
        model,
        smageOptions,
    );

    return res.json({
        id: "smage-proxy-response",
        object: "chat.completion",
        choices: [{ message: result }],
    });
}
