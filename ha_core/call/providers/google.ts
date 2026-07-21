import type { ProviderAdapter } from "./interface.js";
import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";

export const GoogleAdapter: ProviderAdapter = {
    name: "google",

    async call(req) {
        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
        };

        // TODO: fill in actual Google request
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            },
        );

        const json = (await res.json()) as any;

        const content =
            json?.candidates?.[0]?.content?.parts?.[0]?.text ??
            "[empty response]";

        const response = shapeOutput("assistant", content);

        logProviderIO(req.session, "google", req, response);
        return response;
    },
};
