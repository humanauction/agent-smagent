import { SMAGEAgent } from "../../ha_wrap/agent";
import { spawn } from "child_process";
// this file is the CLI for SMAGEAgent testing

// this function sends a test message to the provider, logs result via MCP

export async function testAgent() {
    console.log("starting MCP server...");
    // spawn a child process to run the MCP server, then call the agent and log the result
    const child = spawn(
        "node",
        ["--require", "ts-node/register", "ha_mcp/server.ts"],
        {
            stdio: ["pipe", "pipe", "inherit"],
        },
    );

    child.stdout.on("data", (data) => {
        console.log("MCP:", data.toString());
    });

    console.log("Agent wrap started");
}
