import type { ProviderAdapter } from "./interface.js";
import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";

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

        // TODO: fill in actual OpenAI request
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const json = (await res.json()) as any;

        const content =
            json?.choices?.[0]?.message?.content ?? "[empty response]";

        const response = shapeOutput("assistant", content);

        logProviderIO(req.session, "openai", req, response);
        return response;
    },
};
