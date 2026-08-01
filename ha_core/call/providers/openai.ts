import { normalizeProviderResponse } from "./providerNormalize.js";
import { logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import type { ProviderAdapter } from "./interface.js";

export const OpenAIAdapter: ProviderAdapter = {
    name: "openai",

    async call(req) {
        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
        };

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const json = await res.json();

        const raw =
            json?.choices?.[0]?.message?.content ??
            json?.choices?.[0]?.text ??
            "[empty response]";

        const response = normalizeProviderResponse(raw, "assistant");

        logProviderIO(req.session, "openai", req, response);
        return response;
    },
};
