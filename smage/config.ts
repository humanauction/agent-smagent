import type { OrchestratorConfig } from "../ha_wrap/orchestrator.js";

//this file contains the configuration for the SMAGE orchestrator.
// defines session, strategy, and agents involved in message processing.
export const smageConfig: OrchestratorConfig = {
    session: "cli-session",
    strategy: "fan_out",

    agents: [
        {
            id: "openai-gpt4o",
            provider: "openai",
            model: "gpt-4o-mini",
            options: {},
        },
        {
            id: "anthropic-sonnet",
            provider: "anthropic",
            model: "claude-3-sonnet",
            options: {},
        },
        {
            id: "google-gemini",
            provider: "google",
            model: "gemini-1.5-flash",
            options: {},
        },
    ],
};
