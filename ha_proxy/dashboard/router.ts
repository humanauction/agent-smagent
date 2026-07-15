import express from "express";
import { getWrapper } from "../../ha_wrap/wrapperRegistry.js";
import { loadWrapperMemory } from "../../ha_wrap/shared/memoryLoader.js";
import { scoreMemory } from "../../ha_learn/memoryScore.js";
import { decayMemory } from "../../ha_learn/memoryDecay.js";
import { weightMemory } from "../../ha_learn/memoryWeight.js";
import { pruneMemory } from "../../ha_learn/memoryPrune.js";
import { resolveConflicts } from "../../ha_learn/memoryResolve.js";
import { applyCCR } from "../../ha_core/transform/ccr.js";
import { SMAGEMessage } from "../../ha_core/index.js";
import { userMsg } from "./utils/messages.js";
import { renderAnchors } from "./html/anchors.js";
import { renderMemory } from "./html/memory.js";
import { renderCCR } from "./html/ccr.js";
import { renderProvider } from "./html/provider.js";
import { renderConfig } from "./html/config.js";
import { renderHealth } from "./html/health.js";

// this file defines the dashboard router for the Express app. It provides endpoints for fetching wrapper anchors, memory, CCR, provider responses, and wrapper config.

export const dashboardRouter = express.Router();

// GET /dashboard/:wrapper/anchors
dashboardRouter.get("/:wrapper/anchors", (req, res) => {
    const wrapper = getWrapper(req.params.wrapper as any);
    const anchors = wrapper["prepareWrapperAnchors"]();
    res.json({ anchors });
});

// GET /dashboard/:wrapper/memory
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

        return {
            ...m,
            meta: {
                ...meta,
                score,
                weight,
            },
        };
    });

    const pruned = pruneMemory(scored);
    const resolved = resolveConflicts(pruned);
    const sorted = [...resolved].sort(
        (a, b) => (b.meta?.weight ?? 0) - (a.meta?.weight ?? 0),
    );

    res.json({
        raw,
        scored,
        pruned,
        resolved,
        sorted,
    });
});

// GET /dashboard/:wrapper/ccr?prompt=hello
dashboardRouter.get("/:wrapper/ccr", async (req, res) => {
    const wrapper = getWrapper(req.params.wrapper as any);
    const prompt = req.query.prompt?.toString() ?? "test prompt";

    const anchors = wrapper["prepareWrapperAnchors"]();
    const merged: SMAGEMessage[] = [...anchors, userMsg(prompt)];

    const shaped = await applyCCR(
        merged,
        req.params.wrapper,
        "dashboard-session",
        {},
    );

    res.json({ shaped });
});

// GET /dashboard/:wrapper/provider?prompt=hello
dashboardRouter.get("/:wrapper/provider", async (req, res) => {
    const wrapper = getWrapper(req.params.wrapper as any);
    const prompt = req.query.prompt?.toString() ?? "test prompt";

    const response = await wrapper.debugProvider(
        "dashboard-session",
        [userMsg(prompt)],
        {},
    );

    res.json({ response });
});

// GET /dashboard/:wrapper/config
dashboardRouter.get("/:wrapper/config", (req, res) => {
    const wrapper = getWrapper(req.params.wrapper as any);
    res.json({ config: wrapper["config"] });
});

// GET /dashboard/:wrapper/health
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

// HTML endpoints for dashboard rendering

// GET /dashboard/:wrapper/anchors/html
dashboardRouter.get("/:wrapper/anchors/html", (req, res) => {
    const wrapper = getWrapper(req.params.wrapper as any);
    const anchors = wrapper["prepareWrapperAnchors"]();
    res.send(renderAnchors(anchors));
});

// GET /dashboard/:wrapper/memory/html
dashboardRouter.get("/:wrapper/memory/html", (req, res) => {
    const wrapperId = req.params.wrapper as any;
    const raw = loadWrapperMemory(wrapperId);

    // same scoring pipeline as JSON version
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

        return {
            ...m,
            meta: {
                ...meta,
                score,
                weight,
            },
        };
    });
    const pruned = pruneMemory(scored);
    const resolved = resolveConflicts(pruned);
    const sorted = [...resolved].sort(
        (a, b) => (b.meta?.weight ?? 0) - (a.meta?.weight ?? 0),
    );

    res.send(renderMemory({ raw, scored, pruned, resolved, sorted }));
});

// GET /dashboard/:wrapper/ccr/html
dashboardRouter.get("/:wrapper/ccr/html", async (req, res) => {
    const wrapper = getWrapper(req.params.wrapper as any);
    const prompt = req.query.prompt?.toString() ?? "test prompt";

    const anchors = wrapper["prepareWrapperAnchors"]();
    const merged: SMAGEMessage[] = [
        ...anchors,
        { role: "user" as const, content: prompt },
    ];

    const shaped = await applyCCR(
        merged,
        req.params.wrapper,
        "dashboard-session",
        {},
    );
    res.send(renderCCR(shaped));
});

// GET /dashboard/:wrapper/provider/html
dashboardRouter.get("/:wrapper/provider/html", async (req, res) => {
    const wrapper = getWrapper(req.params.wrapper as any);
    const prompt = req.query.prompt?.toString() ?? "test prompt";

    const response = await wrapper.debugProvider(
        "dashboard-session",
        [{ role: "user" as const, content: prompt }],
        {},
    );

    res.send(renderProvider(response));
});

// GET /dashboard/:wrapper/config/html
dashboardRouter.get("/:wrapper/config/html", (req, res) => {
    const wrapper = getWrapper(req.params.wrapper as any);
    res.send(renderConfig(wrapper["config"]));
});

// GET /dashboard/:wrapper/health/html
dashboardRouter.get("/:wrapper/health/html", (req, res) => {
    const wrapperId = req.params.wrapper;
    const memory = loadWrapperMemory(wrapperId as any);
    const memoryCount = memory.length;

    const health = {
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
    };

    res.send(renderHealth(health));
});
