import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function writeFreezeSnapshot(name: string, data: unknown) {
    const dir = join(process.cwd(), "tests/_freeze");
    mkdirSync(dir, { recursive: true });

    const file = join(dir, `${name}.json`);
    writeFileSync(file, JSON.stringify(data, null, 2), "utf8");

    return file;
}
