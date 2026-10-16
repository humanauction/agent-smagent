import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cacheAppend, configureSessionStore } from "../../ha_core/cache/store.js";
import { defaultSessionStorePath } from "../../ha_core/cache/sessionStore.js";
import { collectSamples, mineSignals } from "../../ha_learn/miner.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
    configureSessionStore(defaultSessionStorePath());
    const { rm } = await import("node:fs/promises");
    await Promise.all(
        temporaryDirectories.splice(0).map((directory) =>
            rm(directory, { recursive: true, force: true }),
        ),
    );
});

describe("learning outcome mining", () => {
    it("normalizes persisted timeline data and preserves outcome provenance", () => {
        const directory = mkdtempSync(join(tmpdir(), "smage-learning-test-"));
        temporaryDirectories.push(directory);
        configureSessionStore(directory);

        cacheAppend("learning-session", {
            stage: "shaped",
            ts: 100,
            data: {
                messages: [{ role: "user", content: "Keep this constraint." }],
            },
        });
        cacheAppend("learning-session", {
            stage: "provider_response",
            ts: 200,
            data: {
                messages: [],
                error: "provider timeout",
            },
        });

        const samples = collectSamples("learning-session");
        expect(samples).toHaveLength(2);
        expect(samples[0]).toMatchObject({
            stage: "shaped",
            outcome: "success",
            timestamp: 100,
        });
        expect(samples[1]).toMatchObject({
            stage: "provider_response",
            outcome: "error",
            error: "provider timeout",
        });

        const update = mineSignals(samples);
        expect(update.anchors?.[0]).toMatchObject({
            outcome: "success",
            source: { session: "learning-session", stage: "shaped" },
        });
        expect(update.priorities?.[0]).toMatchObject({
            outcome: "error",
            source: { timestamp: 200 },
        });
    });

    it("does not create signals from malformed or unrelated timeline entries", () => {
        const update = mineSignals([
            {
                session: "other-session",
                stage: "unknown",
                messages: [],
                outcome: "observation",
            },
        ]);

        expect(update).toEqual({
            anchors: [],
            priorities: [],
            memories: [],
            reducers: [],
        });
    });
});
