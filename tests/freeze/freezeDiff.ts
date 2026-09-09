import { readFileSync } from "node:fs";
import { join } from "node:path";

export function freezeDiff(name: string, current: unknown) {
    const file = join(process.cwd(), "tests/_freeze", `${name}.json`);
    const baseline = JSON.parse(readFileSync(file, "utf8"));

    const currentStr = JSON.stringify(current);
    const baselineStr = JSON.stringify(baseline);

    if (currentStr !== baselineStr) {
        throw new Error(
            `Freeze regression detected in ${name}\n` +
                `--- baseline ---\n${baselineStr}\n\n` +
                `--- current ---\n${currentStr}\n`,
        );
    }
}
