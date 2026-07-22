#!/usr/bin/env node

import { runLearn } from "./commands/learn.js";
import { startProxy } from "./commands/proxy.js";
import { testAgent } from "./commands/agent.js";
import { generateDocs } from "./commands/docs.js";
import { generateHtmlDocs } from "./commands/docs-html.js";

import { runCommand } from "./commands/run.js";
import { anchorsCommand } from "./commands/anchors.js";
import { memoryCommand } from "./commands/memory.js";
import { ccrCommand } from "./commands/ccr.js";
import { providerCommand } from "./commands/provider.js";

import type { ProviderWrapperId } from "../ha_wrap/wrapperRegistry.js";

import { runMultiAgentRR } from "./commands/multi_agent.js";

// this file contains the main CLI entry point for the agentSmagent project

const cmd = process.argv[2];
const arg = process.argv[3];
const wrapper = (process.argv[3] ?? "claude") as ProviderWrapperId;
// const w = getProviderWrapper(wrapper as ProviderWrapperId);
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

        case "agents": {
            const sub = arg; // process.argv[3]

            if (sub === "rr") {
                const prompt = process.argv.slice(4).join(" ").trim();
                await runMultiAgentRR("cli-session", prompt);
                break;
            }

            console.log("Usage:");
            console.log("  smage agents rr <prompt>");
            break;
        }

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
