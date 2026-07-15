import { spawn } from "child_process";
import { reversibleLog } from '../../ha_core/cache/log.js';

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
    memory: {
        rss: 0,
        heap: 0,
    },
};

function sampleSystemMetrics() {
    const usage = process.cpuUsage();
    const mem = process.memoryUsage();

    metrics.cpu = (usage.user + usage.system) / 1000;
    metrics.memory = {
        rss: Math.round(mem.rss / 1024 / 1024),
        heap: Math.round(mem.heapUsed / 1024 / 1024),
    };
}

function startAgent(): AgentProcess {
    console.log("[agent] starting MCP server...");

    // reversible logging: agent start
    reversibleLog("agent", "agent_start", {
        ts: Date.now(),
        restarts: metrics.restarts,
    });

    const proc = spawn(
        "node",
        ["--require", "ts-node/register", "ha_mcp/server.ts"],
        { stdio: ["pipe", "pipe", "inherit"] },
    );

    const agentProc: AgentProcess = {
        proc,
        lastHeartbeat: Date.now(),
    };

    proc.stdout.on("data", (data) => {
        const text = data.toString().trim();

        if (text.includes('"type":"heartbeat"')) {
            const now = Date.now();
            metrics.heartbeatLatency = now - agentProc.lastHeartbeat;
            agentProc.lastHeartbeat = now;
            metrics.lastHeartbeat = now;

            // reversible logging: heartbeat
            reversibleLog("agent", "agent_heartbeat", {
                ts: now,
                latency: metrics.heartbeatLatency,
            });
        }

        console.log(`[mcp] ${text}`);
    });

    proc.on("exit", (code) => {
        console.log(`[agent] MCP server exited with code ${code}`);
        restartAgent();
    });

    return agentProc;
}

function restartAgent() {
    metrics.restarts++;
    console.log("[agent] restarting MCP server...");

    // reversible logging: restart event
    reversibleLog("agent", "agent_restart", {
        ts: Date.now(),
        reason: "exit_or_unresponsive",
        restarts: metrics.restarts,
    });

    agent = startAgent();
}

function startHealthCheck() {
    setInterval(() => {
        if (!agent) return;

        const now = Date.now();
        const diff = now - agent.lastHeartbeat;

        if (diff > 10000) {
            console.log("[agent] Agent is unresponsive, restarting...");

            // reversible logging: heartbeat timeout
            reversibleLog("agent", "agent_restart", {
                ts: now,
                reason: "heartbeat_timeout",
                lastHeartbeat: agent.lastHeartbeat,
            });

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
    console.log("\x1Bc");
    console.log("=== SMAGE Agent Metrics Dashboard ===");
    console.log(
        `Uptime: ${Math.round((Date.now() - metrics.uptimeStart) / 1000)}s`,
    );
    console.log(`Restarts: ${metrics.restarts}`);
    console.log(`Heartbeat latency: ${metrics.heartbeatLatency}ms`);
    console.log(`CPU: ${metrics.cpu}ms`);
    console.log(
        `Memory: RSS ${metrics.memory.rss}MB, Heap ${metrics.memory.heap}MB`,
    );
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
