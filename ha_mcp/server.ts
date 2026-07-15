import * as readline from "readline";
import process from "process";

import { humanAuction_compress } from './tools/compress.js';
import { humanAuction_retrieve } from './tools/retrieve.js';
import { humanAuction_stats } from './tools/stats.js';
import { reversibleLog } from '../ha_core/cache/log.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Heartbeat — top‑level, outside the request handler
setInterval(() => {
    process.stdout.write(
        JSON.stringify({ type: "heartbeat", ts: Date.now() }) + "\n",
    );
}, 8000);

// agent crash logging
process.on("uncaughtException", (err) => {
    process.stdout.write(`crash:${err.message}\n`);
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

        //reversibleLog tracing of requests and responses for debugging
        reversibleLog(params.session, "mcp_request", req);
        reversibleLog(params.session, "mcp_response", result);

        process.stdout.write(JSON.stringify({ id, result }) + "\n");
    } catch (err: any) {
        process.stdout.write(
            JSON.stringify({ id, error: String(err?.message ?? err) }) + "\n",
        );
    }
});
