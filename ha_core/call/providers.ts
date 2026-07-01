import type { SMAGEMessage, SMAGEOptions } from "../index";
import { applyCCR } from "../transform/ccr";

interface OpenAIResponse {
    choices: {
        message: {
            role: string;
            content: string;
        };
    }[];
}

function toProviderFormat(messages: SMAGEMessage[]) {
    return messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));
}

function fromProviderFormat(
    role: "system" | "user" | "assistant" | "tool",
    content: string,
): SMAGEMessage {
    return { role, content };
}

export const OpenAIProvider = {
    name: "openai",

    async call(messages: SMAGEMessage[], model: string, options: SMAGEOptions) {
        const shaped = await applyCCR(messages, "openai", "session", options);

        const payload = {
            model,
            messages: toProviderFormat(shaped),
        };

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const json = (await res.json()) as OpenAIResponse;
        // Safe narrowing
        const choice = json?.choices?.[0];
        const message = choice?.message;

        // Fallbacks
        const role =
            message?.role === "assistant" ||
            message?.role === "user" ||
            message?.role === "system"
                ? message.role
                : "assistant";

        const content = message?.content ?? "[empty response]";

        return fromProviderFormat(role, content);
    },
};

// anthropicProvider
export const anthropicProvider = {
    name: "anthropic",

    async call(messages: SMAGEMessage[], model: string, options: SMAGEOptions) {
        const shaped = await applyCCR(
            messages,
            "anthropic",
            "session",
            options,
        );

        const payload = {
            model,
            messages: toProviderFormat(shaped),
        };

        const res = await fetch("https://api.anthropic.com/v1/complete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": process.env.ANTHROPIC_API_KEY,
            },
            body: JSON.stringify(payload),
        });

        const json = (await res.json()) as unknown;

        const obj = json as {
            content?: { text?: string }[];
        };

        const part = obj.content?.[0];
        const text = part?.text ?? "[empty response]";

        return fromProviderFormat("assistant", text);
    },
};
// googleProvider
export const googleProvider = {
    name: "google",

    async call(messages: SMAGEMessage[], model: string, options: SMAGEOptions) {
        const shaped = await applyCCR(messages, "google", "session", options);

        const payload = {
            model,
            messages: toProviderFormat(shaped),
        };

        const res = await fetch("https://api.google.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.GOOGLE_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const json = (await res.json()) as unknown;
        const obj = json as {
            candidates?: {
                content?: { parts?: { text?: string }[] };
            }[];
        };

        const candidate = obj.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        const text = part?.text ?? "[empty response]";

        return fromProviderFormat("assistant", text);
    },
};
