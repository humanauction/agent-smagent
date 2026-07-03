import { spawn } from "child_process";
// this file is the CLI for SMAGEAgent testing

interface AgentProcess {
    proc: ReturnType<typeof spawn>;
    lastHeartbeat: number;
}

let agent: AgentProcess | null = null;
// this function sends a test message to the provider, logs result via MCP

function startAgent(): AgentProcess {
    console.log("[agent] starting MCP server...");
    // spawn a child process to run the MCP server, then call the agent and log the result
    const proc = spawn(
        "node",
        ["--require", "ts-node/register", "ha_mcp/server.ts"],
        {
            stdio: ["pipe", "pipe", "inherit"],
        },
    );

    const now = Date.now();

    const agentProc: AgentProcess = {
        proc,
        lastHeartbeat: now,
    };

    proc.stdout.on("data", (data) => {
        const text = data.toString().trim();

        // heartbeat check
        if (text.includes('"type":"heartbeat"')) {
            agentProc.lastHeartbeat = Date.now();
        }
        console.log(`[mcp] ${text}`);
    });

    proc.on("exit", (code) => {
        console.log(`[mcp] MCP server exited with code ${code}`);
        restartAgent();
    });

    return agentProc;
}

function restartAgent() {
    console.log("[agent] restarting MCP server...");
    agent = startAgent();
}

// healthcheck every 5 seconds
function startHealthCheck() {
    setInterval(() => {
        if (!agent) return;

        const now = Date.now();
        const diff = now - agent.lastHeartbeat;

        if (diff > 10000) {
            console.log("[agent] Agent is unresponsive, restarting...");
            agent.proc.kill;
            restartAgent();
        }
    }, 5000);
}

export async function testAgent() {
    console.log("[agent] supervisor starting...");
    agent = startAgent();
    startHealthCheck();

    console.log("[agent] agent supervisor running. Press Ctrl+C to stop.");
}
