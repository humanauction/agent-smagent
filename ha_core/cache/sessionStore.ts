import {
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SESSION_FORMAT_VERSION = 1;

export interface SessionRecord {
    version: number;
    session: string;
    createdAt: number;
    updatedAt: number;
    cache: unknown | null;
    messages: unknown[];
    history: unknown[];
}

export class SessionStoreError extends Error {
    constructor(
        message: string,
        public readonly session: string,
        public readonly cause?: unknown,
    ) {
        super(message);
        this.name = "SessionStoreError";
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRecord(value: unknown, session: string): SessionRecord {
    if (!isRecord(value)) {
        throw new SessionStoreError("Session data is not an object", session);
    }

    if (
        value.version !== SESSION_FORMAT_VERSION ||
        value.session !== session ||
        typeof value.createdAt !== "number" ||
        typeof value.updatedAt !== "number" ||
        !Array.isArray(value.history)
    ) {
        throw new SessionStoreError(
            "Session data has an unsupported or invalid format",
            session,
        );
    }

    return {
        version: SESSION_FORMAT_VERSION,
        session,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        cache: value.cache ?? null,
        messages: Array.isArray(value.messages) ? value.messages : [],
        history: value.history,
    };
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function safeSessionName(session: string): string {
    const normalized = session.trim();
    if (!normalized || normalized === "." || normalized === "..") {
        throw new Error("Session ID must not be empty");
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(normalized)) {
        throw new Error(
            "Session ID must contain only letters, numbers, dots, underscores, or hyphens",
        );
    }

    return normalized;
}

export function defaultSessionStorePath(): string {
    return process.env.SMAGE_CACHE_DIR ?? join(tmpdir(), "smage-sessions");
}

export class FileSessionStore {
    constructor(private readonly rootDir: string = defaultSessionStorePath()) {}

    private filePath(session: string): string {
        return join(this.rootDir, `${safeSessionName(session)}.json`);
    }

    private read(session: string): SessionRecord | null {
        const path = this.filePath(session);
        if (!existsSync(path)) return null;

        try {
            return validateRecord(
                JSON.parse(readFileSync(path, "utf8")) as unknown,
                session,
            );
        } catch (error) {
            if (error instanceof SessionStoreError) throw error;
            throw new SessionStoreError(
                "Session data could not be read or parsed",
                session,
                error,
            );
        }
    }

    private write(record: SessionRecord): void {
        mkdirSync(this.rootDir, { recursive: true });

        const path = this.filePath(record.session);
        const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
        try {
            writeFileSync(
                temporaryPath,
                `${JSON.stringify(record, null, 2)}\n`,
                "utf8",
            );
            renameSync(temporaryPath, path);
        } catch (error) {
            if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
            throw new SessionStoreError(
                "Session data could not be written atomically",
                record.session,
                error,
            );
        }
    }

    get(session: string): SessionRecord | null {
        const record = this.read(session);
        return record ? clone(record) : null;
    }

    getOrCreate(session: string): SessionRecord {
        const existing = this.get(session);
        if (existing) return existing;

        const now = Date.now();
        const record: SessionRecord = {
            version: SESSION_FORMAT_VERSION,
            session: safeSessionName(session),
            createdAt: now,
            updatedAt: now,
            cache: null,
            messages: [],
            history: [],
        };
        this.write(record);
        return clone(record);
    }

    putCache(session: string, cache: unknown): void {
        const record = this.getOrCreate(session);
        record.cache = clone(cache);
        record.updatedAt = Date.now();
        this.write(record);
    }

    putMessage(session: string, index: number, message: unknown): void {
        if (!Number.isInteger(index) || index < 0) {
            throw new Error("Message index must be a non-negative integer");
        }

        const record = this.getOrCreate(session);
        record.messages[index] = clone(message);
        record.updatedAt = Date.now();
        this.write(record);
    }

    getMessage(session: string, index: number): unknown | null {
        const record = this.get(session);
        return record?.messages[index] ?? null;
    }

    appendHistory(session: string, entry: unknown): void {
        const record = this.getOrCreate(session);
        record.history.push(clone(entry));
        record.updatedAt = Date.now();
        this.write(record);
    }

    delete(session: string): boolean {
        const path = this.filePath(session);
        if (!existsSync(path)) return false;
        unlinkSync(path);
        return true;
    }
}
