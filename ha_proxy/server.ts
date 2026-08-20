import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import type { SMAGEMessage } from "../ha_core/index.js";
import { dashboardRouter } from "./router.js";
import { routeLLM } from "./routing/router.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/dashboard", dashboardRouter);
app.post("/v1/chat/completions", routeLLM);

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

const port = process.env.SMAGE_PROXY_PORT || 8080;

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.listen(port, () => {
    console.log(`SMAGE proxy listening on :${port}`);
});
