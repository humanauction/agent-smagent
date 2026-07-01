import * as readline from "readline";
import process from "process";

import { humanAuction_compress } from "./tools/compress";
import { humanAuction_retrieve } from "./tools/retrieve";
import { humanAuction_stats } from "./tools/stats";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.on("line", async (line: string) => {
    let req;
    try {
        req = JSON.parse(line);
    } catch {
        process.stdout.write(JSON.stringify({ error: "Invalid JSON" }) + "\n");
        return;
    }

    const { method, params, id } = req;

    try {
        let result;

        if (method === "humanAuction_compress") {
            result = await humanAuction_compress(
                params.messages,
                params.agent,
                params.session,
                params.options ?? {},
            );
        } else if (method === "humanAuction_retrieve") {
            result = await humanAuction_retrieve(params.session);
        } else if (method === "humanAuction_stats") {
            result = await humanAuction_stats(params.messages);
        } else {
            result = { error: `Unknown method: ${method}` };
        }

        process.stdout.write(JSON.stringify({ id, result }) + "\n");
    } catch (err: any) {
        process.stdout.write(
            JSON.stringify({ id, error: String(err?.message ?? err) }) + "\n",
        );
    }
});
