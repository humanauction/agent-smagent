#!/usr/bin/env tsx

import { runLearn } from "./commands/learn";
import { startProxy } from "./commands/proxy";
import { testAgent } from "./commands/agent";
import { generateDocs } from "./commands/docs";
import { generateHtmlDocs } from "./commands/docs-html";

// this file contains the main CLI entry point for the agentSmagent project

const cmd = process.argv[2];
const arg = process.argv[3];

// this function is the entry point for the CLI, handles learning, proxy, and agent commands
async function main() {
    switch (cmd) {
        case "learn":
            await runLearn(arg ?? "default");
            break;

        case "proxy":
            await startProxy();
            break;

        case "agent":
            await testAgent();
            break;

        case "docs":
            await generateDocs();
            break;

        case "docs:html":
            await generateHtmlDocs();
            break;

        default:
            console.log("Commands:");
            console.log("  AgentSmagent learn <session>");
            console.log("  AgentSmagent proxy");
            console.log("  AgentSmagent agent");
            console.log("  AgentSmagent docs");
            console.log("  AgentSmagent docs:html");
    }
}

main();
