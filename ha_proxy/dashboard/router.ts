import express from "express";
import { getProviderWrapper } from "../../ha_wrap/wrapperRegistry.js";
import { loadWrapperMemory } from "../../ha_wrap/shared/memoryLoader.js";
import { scoreMemory } from "../../ha_learn/memoryScore.js";
import { decayMemory } from "../../ha_learn/memoryDecay.js";
import { weightMemory } from "../../ha_learn/memoryWeight.js";
import { pruneMemory } from "../../ha_learn/memoryPrune.js";
import { resolveConflicts } from "../../ha_learn/memoryResolve.js";

import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";

import { SMAGEMessage } from "../../ha_core/index.js";
import { userMsg } from "./utils/messages.js";

import { renderAnchors } from "./html/anchors.js";
import { renderMemory } from "./html/memory.js";
import { renderCCR } from "./html/ccr.js";
import { renderProvider } from "./html/provider.js";
import { renderConfig } from "./html/config.js";
import { renderHealth } from "./html/health.js";

import { orchestratorTelemetry } from "../../ha_wrap/orchestrator.js";

export const dashboardRouter = express.Router();

/* -------------------------------
   1. ANCHORS (pipeline only)
------------------------------- */
dashboardRouter.get("/:wrapper/anchors", async (req, res) => {
    const telemetry = new ProviderChainTelemetry();
    const pipeline = new CCRPipeline(telemetry);

    const shaped = await pipeline.run(
        "dashboard-session",
        [{ role: "user", content: "hello", meta: {} } satisfies SMAGEMessage],
        {},
    );
    const anchorArray = Object.values(shaped.anchor).filter(Boolean);
    res.send(renderAnchors(anchorArray));
});

/* -------------------------------
   2. MEMORY (unchanged)
------------------------------- */
dashboardRouter.get("/:wrapper/memory", (req, res) => {
    const wrapperId = req.params.wrapper as any;
    const raw = loadWrapperMemory(wrapperId);

    const scored = raw.map((m) => {
        const meta = m.meta ?? {};
        const score = scoreMemory({
            failureType: meta.failureType,
            frequency: meta.frequency ?? 1,
            recencyMs: Date.now() - (meta.timestamp ?? Date.now()),
            wrapperId: meta.wrapper,
        });

        const weight = decayMemory(
            weightMemory(score),
            Date.now() - (meta.timestamp ?? Date.now()),
        );

        return { ...m, meta: { ...meta, score, weight } };
    });

    const pruned = pruneMemory(scored);
    const resolved = resolveConflicts(pruned);
    const sorted = [...resolved].sort(
        (a, b) => (b.meta?.weight ?? 0) - (a.meta?.weight ?? 0),
    );

    res.json({ raw, scored, pruned, resolved, sorted });
});

/* -------------------------------
   3. CCR JSON (pipeline only)
------------------------------- */
dashboardRouter.get("/:wrapper/ccr", async (req, res) => {
    const prompt = req.query.prompt?.toString() ?? "test prompt";

    const telemetry = new ProviderChainTelemetry();
    const pipeline = new CCRPipeline(telemetry);

    const shaped = await pipeline.run(
        "dashboard-session",
        [{ role: "user", content: prompt, meta: {} } satisfies SMAGEMessage],
        {},
    );

    res.json({ shaped });
});

/* -------------------------------
   4. PROVIDER (unchanged)
------------------------------- */
dashboardRouter.get("/:wrapper/provider", async (req, res) => {
    const wrapper = getProviderWrapper(req.params.wrapper as any);
    const prompt = req.query.prompt?.toString() ?? "test prompt";

    const response = await wrapper.debugProvider(
        "dashboard-session",
        [userMsg(prompt)],
        {},
    );

    res.json({ response });
});

/* -------------------------------
   5. CONFIG (unchanged)
------------------------------- */
dashboardRouter.get("/:wrapper/config", (req, res) => {
    const wrapper = getProviderWrapper(req.params.wrapper as any);
    res.json({ config: wrapper["config"] });
});

/* -------------------------------
   6. HEALTH (unchanged)
------------------------------- */
dashboardRouter.get("/:wrapper/health", (req, res) => {
    const wrapperId = req.params.wrapper;
    const memory = loadWrapperMemory(wrapperId as any);
    const memoryCount = memory.length;

    res.json({
        wrapper: wrapperId,
        memoryCount,
        memoryStatus:
            memoryCount === 0
                ? "empty"
                : memoryCount < 10
                  ? "healthy"
                  : memoryCount < 50
                    ? "growing"
                    : "large",
    });
});

/* -------------------------------
   7. HTML ROUTES (pipeline only)
------------------------------- */
dashboardRouter.get("/:wrapper/anchors/html", async (req, res) => {
    const telemetry = new ProviderChainTelemetry();
    const pipeline = new CCRPipeline(telemetry);

    const shaped = await pipeline.run(
        "dashboard-session",
        [{ role: "user", content: "hello", meta: {} } satisfies SMAGEMessage],
        {},
    );
    const anchorArray = Object.values(shaped.anchor).filter(Boolean);
    res.send(renderAnchors(anchorArray));
});

dashboardRouter.get("/:wrapper/ccr/html", async (req, res) => {
    const session = "dashboard-session";
    orchestratorTelemetry.clearSession(session);

    const prompt = req.query.prompt?.toString() ?? "test prompt";

    const telemetry = new ProviderChainTelemetry();
    const pipeline = new CCRPipeline(telemetry);

    await pipeline.run(
        session,
        [{ role: "user", content: prompt, meta: {} } satisfies SMAGEMessage],
        {},
    );

    const events = orchestratorTelemetry.getSession(session);
    const metrics = events.filter((e: any) => e.stage === "metrics");
    const timeline = events;

    res.send(renderCCR({ metrics, timeline }));
});
