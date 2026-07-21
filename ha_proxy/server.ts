import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
import { callProvider } from "../ha_core/call/providers/index.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

function toSMAGEMessages(
    messages: Array<{ role: string; content: string }>,
): SMAGEMessage[] {
    return messages.map((m) => ({
        role: m.role as SMAGEMessage["role"],
        content: m.content,
        name: m.role === "assistant" ? "assistant" : (undefined as any),
        meta: {},
    }));
}

function fromSMAGEMessage(msg: SMAGEMessage) {
    return {
        role: msg.role,
        content: msg.content,
    };
}

app.post("/v1/chat/completions", async (req, res) => {
    try {
        const {
            model,
            messages,
            smage_options,
            provider, // <-- provider comes from top-level request
        }: {
            model: string;
            messages: Array<{ role: string; content: string }>;
            smage_options?: SMAGEOptions;
            provider?: string;
        } = req.body;

        const session = (req.headers["x-smage-session"] as string) || "default";

        const providerName = provider ?? "openai";

        const smageMessages = toSMAGEMessages(messages);

        const response = await callProvider({
            session,
            model,
            messages: smageMessages,
            options: {
                ...(smage_options ?? {}),
                provider: providerName, // <-- provider lives here
            },
        });

        const assistantMsg = fromSMAGEMessage({
            role: "assistant",
            content: response.content,
            name: "assistant",
            meta: {},
        });

        res.json({
            id: `smage-${Date.now()}`,
            object: "chat.completion",
            model,
            choices: [
                {
                    index: 0,
                    message: assistantMsg,
                    finish_reason: "stop",
                },
            ],
        });
    } catch (err) {
        console.error("SMAGE proxy error:", err);
        res.status(500).json({
            error: {
                message: "SMAGE proxy error",
            },
        });
    }
});

const port = process.env.SMAGE_PROXY_PORT || 8080;
app.listen(port, () => {
    console.log(`SMAGE proxy listening on :${port}`);
});
