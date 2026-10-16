import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
    defaultSessionStorePath,
    FileSessionStore,
    SessionStoreError,
} from "../../ha_core/cache/sessionStore.js";
import {
    cacheAppend,
    cacheDelete,
    cacheGet,
    cachePut,
    cacheRetrieve,
    cacheStore,
    configureSessionStore,
} from "../../ha_core/cache/store.js";

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

function createStore(): FileSessionStore {
    const directory = mkdtempSync(join(tmpdir(), "smage-session-test-"));
    temporaryDirectories.push(directory);
    return new FileSessionStore(directory);
}

describe("FileSessionStore", () => {
    it("persists cache and history in a versioned session envelope", () => {
        const store = createStore();

        store.putCache("session-one", { value: "cached" });
        store.appendHistory("session-one", { stage: "shaped" });

        const reopened = new FileSessionStore(
            temporaryDirectories[0] as string,
        );
        expect(reopened.get("session-one")).toMatchObject({
            version: 1,
            session: "session-one",
            cache: { value: "cached" },
            messages: [],
            history: [{ stage: "shaped" }],
        });
    });

    it("rejects unsafe session IDs before touching the filesystem", () => {
        const store = createStore();

        expect(() => store.get("../escape")).toThrow(
            "Session ID must contain only",
        );
    });

    it("surfaces malformed data instead of treating it as a new session", () => {
        const store = createStore();
        store.putCache("broken", { value: "before corruption" });

        const file = join(temporaryDirectories[0] as string, "broken.json");
        writeFileSync(file, "{not-json", "utf8");

        expect(() => store.getOrCreate("broken")).toThrow(SessionStoreError);
        expect(() => store.get("broken")).toThrow(
            "could not be read or parsed",
        );
    });

    it("writes complete snapshots that can be read after a new store instance", () => {
        const store = createStore();
        store.appendHistory("session-two", { stage: "first", value: 1 });

        const file = join(temporaryDirectories[0] as string, "session-two.json");
        expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({
            session: "session-two",
            history: [{ stage: "first", value: 1 }],
        });
    });

    it("keeps the existing cache API backed by the durable session record", () => {
        const directory = mkdtempSync(join(tmpdir(), "smage-cache-api-test-"));
        temporaryDirectories.push(directory);
        configureSessionStore(directory);

        cachePut("api-session", { provider: "local" });
        cacheStore("api-session", 0, {
            role: "user",
            content: "hello",
        });
        cacheAppend("api-session", { stage: "reduced" });

        expect(cacheGet("api-session", 0)).toEqual({
            role: "user",
            content: "hello",
        });
        expect(cacheRetrieve("api-session")).toEqual({
            provider: "local",
            timeline: [{ stage: "reduced" }],
        });
        expect(cacheDelete("api-session")).toBe(true);
        expect(cacheRetrieve("api-session")).toBeNull();
    });
});
