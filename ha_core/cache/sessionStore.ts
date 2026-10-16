import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SESSION_FORMAT_VERSION = 2;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export type SessionStatus = "active" | "expired" | "deleted";

export interface SessionRecord {
    version: number;
    session: string;
    createdAt: number;
    updatedAt: number;
    status: SessionStatus;
    expiresAt: number | null;
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
        !["active", "expired", "deleted"].includes(String(value.status)) ||
        (value.expiresAt !== null && typeof value.expiresAt !== "number") ||
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
        status: value.status as SessionStatus,
        expiresAt: value.expiresAt as number | null,
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

    private backupPath(session: string): string {
        return join(this.rootDir, `${safeSessionName(session)}.json.bak`);
    }

    private readFile(path: string, session: string): SessionRecord {
        return validateRecord(
            JSON.parse(readFileSync(path, "utf8")) as unknown,
            session,
        );
    }

    private read(session: string): SessionRecord | null {
        const path = this.filePath(session);
        if (!existsSync(path)) return null;

        try {
            return this.readFile(path, session);
        } catch (error) {
            const backup = this.backupPath(session);
            if (!existsSync(backup)) {
                throw new SessionStoreError(
                    "Session data could not be read or parsed and no recovery snapshot exists",
                    session,
                    error,
                );
            }

            try {
                const recovered = this.readFile(backup, session);
                this.write(recovered);
                return recovered;
            } catch (recoveryError) {
                throw new SessionStoreError(
                    "Session data and its recovery snapshot could not be read",
                    session,
                    recoveryError,
                );
            }
        }
    }

    private write(record: SessionRecord): void {
        mkdirSync(this.rootDir, { recursive: true });

        const path = this.filePath(record.session);
        const backup = this.backupPath(record.session);
        const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
        try {
            writeFileSync(
                temporaryPath,
                `${JSON.stringify(record, null, 2)}\n`,
                "utf8",
            );
            renameSync(temporaryPath, path);
            copyFileSync(path, backup);
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
        if (!record) return null;

        if (
            record.status === "active" &&
            record.expiresAt !== null &&
            record.expiresAt <= Date.now()
        ) {
            record.status = "expired";
            record.updatedAt = Date.now();
            this.write(record);
        }

        return record.status === "active" ? clone(record) : null;
    }

    inspect(session: string): SessionRecord | null {
        const record = this.read(session);
        if (!record) return null;
        if (
            record.status === "active" &&
            record.expiresAt !== null &&
            record.expiresAt <= Date.now()
        ) {
            record.status = "expired";
            record.updatedAt = Date.now();
            this.write(record);
        }
        return clone(record);
    }

    resume(session: string, ttlMs = DEFAULT_TTL_MS): SessionRecord {
        const existing = this.inspect(session);
        if (existing) {
            if (existing.status !== "active") {
                throw new SessionStoreError(
                    `Cannot resume ${existing.status} session`,
                    session,
                );
            }
            return existing;
        }

        const now = Date.now();
        const record: SessionRecord = {
            version: SESSION_FORMAT_VERSION,
            session: safeSessionName(session),
            createdAt: now,
            updatedAt: now,
            status: "active",
            expiresAt: now + ttlMs,
            cache: null,
            messages: [],
            history: [],
        };
        this.write(record);
        return clone(record);
    }

    getOrCreate(session: string): SessionRecord {
        return this.resume(session);
    }

    putCache(session: string, cache: unknown): void {
        const record = this.resume(session);
        record.cache = clone(cache);
        record.updatedAt = Date.now();
        this.write(record);
    }

    putMessage(session: string, index: number, message: unknown): void {
        if (!Number.isInteger(index) || index < 0) {
            throw new Error("Message index must be a non-negative integer");
        }

        const record = this.resume(session);
        record.messages[index] = clone(message);
        record.updatedAt = Date.now();
        this.write(record);
    }

    getMessage(session: string, index: number): unknown | null {
        const record = this.get(session);
        return record?.messages[index] ?? null;
    }

    appendHistory(session: string, entry: unknown): void {
        const record = this.resume(session);
        record.history.push(clone(entry));
        record.updatedAt = Date.now();
        this.write(record);
    }

    delete(session: string): boolean {
        const record = this.inspect(session);
        if (!record) return false;
        if (record.status === "deleted") return false;
        record.status = "deleted";
        record.updatedAt = Date.now();
        this.write(record);
        return true;
    }
}
