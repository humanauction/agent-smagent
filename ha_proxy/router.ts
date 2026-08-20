import { Router, type Request, type Response } from "express";
import { callProvider } from "../ha_core/call/providers/index.js";
import { reversibleLog } from "../ha_core/cache/log.js";
import { applyCCR } from "../ha_core/transform/ccr.js";
import { mapProviderRole } from "../ha_core/call/providers/roles.js";
import { CCRPipeline } from "../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../ha_core/call/providers/chainTelemetry.js";
import { wrapperRegistry } from "../ha_wrap/wrapperRegistry.js";
import { layout } from "./dashboard/html/layout.js";
import type { SMAGEMessage, SMAGEOptions } from "../ha_core/index.js";
/* ---------- runtime endpoint ---------- */

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

/* ---------- CCR dashboard router ---------- */

export const dashboardRouter = Router();
/* -------------------------------
   1. CCR ANCHORS (pipeline only)
------------------------------- */
dashboardRouter.get(
    "/:wrapper/anchors",
    async (req: Request, res: Response) => {
        const { wrapper } = req.params;

        try {
            // validate wrapper exists
            wrapperRegistry.get(wrapper as any);

            const telemetry = new ProviderChainTelemetry();
            const pipeline = new CCRPipeline(telemetry);

            const shaped = await pipeline.run(
                "debug-session",
                [
                    {
                        role: "user",
                        content: "hello",
                        meta: {},
                    } satisfies SMAGEMessage,
                ],
                {},
            );

            res.json({
                wrapper,
                anchor: shaped.anchor,
            });
        } catch {
            res.status(404).json({ error: `Wrapper not found: ${wrapper}` });
        }
    },
);

/* -------------------------------
   2. CCR RAW + SHAPED JSON
------------------------------- */
dashboardRouter.get("/:wrapper/ccr", async (req: Request, res: Response) => {
    const { wrapper } = req.params;
    const prompt = req.query.prompt?.toString() ?? "hello";

    try {
        wrapperRegistry.get(wrapper as any);

        const telemetry = new ProviderChainTelemetry();
        const pipeline = new CCRPipeline(telemetry);

        const shaped = await pipeline.run(
            "debug-session",
            [
                {
                    role: "user",
                    content: prompt,
                    meta: {},
                } satisfies SMAGEMessage,
            ],
            {},
        );

        res.json({
            wrapper,
            prompt,
            shaped,
        });
    } catch (err) {
        res.status(500).json({ error: "CCR failed", detail: err });
    }
});

/* -------------------------------
   3. CCR HTML DASHBOARD
------------------------------- */
dashboardRouter.get(
    "/:wrapper/ccr/html",
    async (req: Request, res: Response) => {
        const { wrapper } = req.params;
        const prompt = req.query.prompt?.toString() ?? "hello";

        try {
            wrapperRegistry.get(wrapper as any);

            const telemetry = new ProviderChainTelemetry();
            const pipeline = new CCRPipeline(telemetry);

            const shaped = await pipeline.run(
                "debug-session",
                [
                    {
                        role: "user",
                        content: prompt,
                        meta: {},
                    } satisfies SMAGEMessage,
                ],
                {},
            );

            const rawTokens = shaped.original.reduce(
                (n, m) => n + m.content.length,
                0,
            );
            const windowTokens = shaped.windowed.reduce(
                (n, m) => n + m.content.length,
                0,
            );
            const compressedTokens = shaped.compressed.reduce(
                (n, m) => n + m.content.length,
                0,
            );
            const reducedTokens = shaped.reduced.content.length;

            const metrics = {
                rawTokens,
                windowTokens,
                compressedTokens,
                reducedTokens,
            };

            const html = layout(
                `CCR Dashboard — ${wrapper}`,
                `
                    <h2>Prompt</h2>
                    <pre>${prompt}</pre>

                    <h2>Metrics</h2>
                    <pre>${JSON.stringify(metrics, null, 2)}</pre>

                    <h2>Pipeline Result</h2>
                    <pre>${JSON.stringify(shaped, null, 2)}</pre>
                `,
            );

            res.send(html);
        } catch (err) {
            res.status(500).json({ error: "CCR HTML failed", detail: err });
        }
    },
);
