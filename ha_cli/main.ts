#!/usr/bin/env tsx

import { runLearningCycle } from "../ha_learn/engine";
import { startProxy } from "./commands/proxy";
import { testAgent } from "./commands/agent";

// this file contains the main CLI entry point for the agentSmagent project

const cmd = process.argv[2];
const arg = process.argv[3];

// this function is the entry point for the CLI, handles learning, proxy, and agent commands
async function main() {
    switch (cmd) {
        case "learn":
            const session = arg ?? "default";
            const update = await runLearningCycle(session);
            console.log(JSON.stringify(update, null, 2));
            break;

        case "proxy":
            await startProxy();
            break;

        case "agent":
            await testAgent();
            break;

        default:
            console.log("Commands:");
            console.log("  humanAuction learn <session>");
            console.log("  humanAuction proxy");
            console.log("  humanAuction agent");
    }
}

main();
