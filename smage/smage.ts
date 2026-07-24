#!/usr/bin/env node

import * as readline from "node:readline";
import type { SMAGEMessage } from "../ha_core/index.js";
import { SMAGEOrchestrator } from "../ha_wrap/orchestrator.js";
import { smageConfig } from "./config.js";

/*
this file is the entry point for the SMAGE CLI. sets up a simple command-line interface.
allows users to input messages then processed by SMAGE orchestrator.
orchestrator uses smageConfig to determine message handling, agents(s) response generation involvement.
*/
async function main(): Promise<void> {
    const orchestrator = new SMAGEOrchestrator(smageConfig);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question("SMAGE> ", async (input: string) => {
        const trimmed = input.trim();
        if (trimmed === "") {
            console.log("[no input]");
            rl.close();
            return;
        }

        const messages: SMAGEMessage[] = [{ role: "user", content: trimmed }];

        try {
            const result = await orchestrator.orchestrate(messages);
            console.log(result.content);
        } catch (err) {
            console.error("SMAGE error:", err);
        }

        rl.close();
    });
}

main().catch((err) => {
    console.error("SMAGE fatal error:", err);
    process.exit(1);
});
