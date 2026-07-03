import { spawn } from "child_process";
// this file is the CLI for SMAGEAgent testing

interface AgentProcess {
    proc: ReturnType<typeof spawn>;
    lastHeartbeat: number;
}

let agent: AgentProcess | null = null;

const metrics = {
    restarts: 0,
    uptimeStart: Date.now(),
    lastHeartbeat: Date.now(),
    heartbeatLatency: 0,
    cpu: 0,
    memory: 0,
};

function sampleSystemMetrics() {
    const usage = process.cpuUsage();
    const mem = process.memoryUsage();

    metrics.cpu = (usage.user + usage.system) / 1000; // ms
    metrics.memory = {
        rss: Math.round(mem.rss / 1024 / 1024), // MB
        heap: Math.round(mem.heapUsed / 1024 / 1024), // MB
    };
}

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

    const agentProc: AgentProcess = {
        proc,
        lastHeartbeat: Date.now(),
    };

    proc.stdout.on("data", (data) => {
        const text = data.toString().trim();

        // heartbeat check
        if (text.includes('"type":"heartbeat"')) {
            const now = Date.now();
            metrics.heartbeatLatency = now - agentProc.lastHeartbeat;
            agentProc.lastHeartbeat = now;
            metrics.lastHeartbeat = now;
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
    metrics.restarts++;
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
            agent.proc.kill();
            restartAgent();
        }
    }, 5000);
}

function startDashboard() {
    setInterval(() => {
        sampleSystemMetrics();
        printDashboard();
    }, 2000);
}

function printDashboard() {
    console.log("\x1Bc"); // safe clear console
    console.log("=== SMAGE Agent Metrics Dashboard ===");
    console.log(
        `Uptime: ${Math.round((Date.now() - metrics.uptimeStart) / 1000)}s`,
    );
    console.log(`Restarts: ${metrics.restarts}`);
    console.log(`Heartbeat latency: ${metrics.heartbeatLatency}ms`);
    console.log(`CPU: ${metrics.cpu}ms`);
    console.log(`Memory: ${metrics.memory}MB`);
    console.log(
        `Last heartbeat: ${new Date(metrics.lastHeartbeat).toLocaleTimeString()}`,
    );
    console.log("=====================================");
}

export async function testAgent() {
    console.log("[agent] supervisor starting...");
    agent = startAgent();
    startHealthCheck();
    startDashboard();

    console.log("[agent] agent supervisor running. Press Ctrl+C to stop.");
}
