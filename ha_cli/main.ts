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
import { runMultiAgentRR } from "./commands/multi_agent.js";
import { timeoutGuard } from "../ha_core/call/providers/timeout.js";
import type { ProviderWrapperId } from "../ha_wrap/wrapperRegistry.js";

// this file contains the main CLI entry point for the agentSmagent project
const CLI_TIMEOUT_MS = 90_000;
const cmd = process.argv[2];
const arg = process.argv[3];
const wrapper = (process.argv[3] ?? "claude") as ProviderWrapperId;
// const w = getProviderWrapper(wrapper as ProviderWrapperId);
const prompt = process.argv.slice(4).join(" ").trim();

// this function is the entry point for the CLI, handles learning, proxy, and agent commands
async function main() {
    try {
        switch (cmd) {
            case "run":
                await timeoutGuard(
                    runCommand(wrapper, prompt),
                    CLI_TIMEOUT_MS,
                    "cli-run",
                );
                break;

            case "anchors":
                await timeoutGuard(
                    anchorsCommand(wrapper),
                    CLI_TIMEOUT_MS,
                    "cli-anchors",
                );
                break;

            case "memory":
                await timeoutGuard(
                    memoryCommand(wrapper),
                    CLI_TIMEOUT_MS,
                    "cli-memory",
                );
                break;

            case "ccr":
                await timeoutGuard(
                    ccrCommand(wrapper, prompt),
                    CLI_TIMEOUT_MS,
                    "cli-ccr",
                );
                break;

            case "provider":
                await timeoutGuard(
                    providerCommand(wrapper, prompt),
                    CLI_TIMEOUT_MS,
                    "cli-provider",
                );
                break;

            // existing commands
            case "learn":
                await timeoutGuard(
                    runLearn(arg ?? "default"),
                    CLI_TIMEOUT_MS,
                    "cli-learn",
                );
                break;

            case "proxy":
                await timeoutGuard(startProxy(), CLI_TIMEOUT_MS, "cli-proxy");
                break;

            case "agent":
                await timeoutGuard(testAgent(), CLI_TIMEOUT_MS, "cli-agent");
                break;

            case "docs":
                await timeoutGuard(generateDocs(), CLI_TIMEOUT_MS, "cli-docs");
                break;

            case "docs:html":
                await timeoutGuard(
                    generateHtmlDocs(),
                    CLI_TIMEOUT_MS,
                    "cli-docs-html",
                );
                break;

            case "agents": {
                const sub = arg; // process.argv[3]

                if (sub === "rr") {
                    const prompt = process.argv.slice(4).join(" ").trim();
                    await timeoutGuard(
                        runMultiAgentRR("cli-session", prompt),
                        CLI_TIMEOUT_MS,
                        "cli-agents-rr",
                    );
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
    } catch (err) {
        console.error("CLI error:", err);
        process.exit(1);
    }
}

main();
