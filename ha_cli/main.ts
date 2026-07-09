#!/usr/bin/env tsx

import { runLearn } from "./commands/learn";
import { startProxy } from "./commands/proxy";
import { testAgent } from "./commands/agent";
import { generateDocs } from "./commands/docs";
import { generateHtmlDocs } from "./commands/docs-html";

import { runCommand } from "./commands/run";
import { anchorsCommand } from "./commands/anchors";
import { memoryCommand } from "./commands/memory";
import { ccrCommand } from "./commands/ccr";
import { providerCommand } from "./commands/provider";

import type { WrapperId } from "../ha_wrap/wrapperRegistry";

// this file contains the main CLI entry point for the agentSmagent project

const cmd = process.argv[2];
const arg = process.argv[3];
const wrapper = (process.argv[3] ?? "claude") as WrapperId;
const w = getWrapper(wrapper as WrapperId);
const prompt = process.argv.slice(4).join(" ").trim();

// this function is the entry point for the CLI, handles learning, proxy, and agent commands
async function main() {
    switch (cmd) {
        case "run":
            await runCommand(wrapper, prompt);
            break;

        case "anchors":
            await anchorsCommand(wrapper);
            break;

        case "memory":
            await memoryCommand(wrapper);
            break;

        case "ccr":
            await ccrCommand(wrapper, prompt);
            break;

        case "provider":
            await providerCommand(wrapper, prompt);
            break;

        // existing commands
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
            console.error(`Unknown command: ${cmd}`);
            console.log("Commands:");
            console.log("  AgentSmagent learn <session>");
            console.log("  AgentSmagent proxy");
            console.log("  AgentSmagent agent");
            console.log("  AgentSmagent docs");
            console.log("  AgentSmagent docs:html");
            process.exit(1);
    }
}

main();
