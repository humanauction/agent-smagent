import { spawn } from "child_process";

interface MCPRequest {
    id: number;
    method: string;
    params?: any;
}

interface MCPResponse {
    id: number;
    result?: any;
    error?: string;
}

export class SMAGEMCPClient {
    private proc: ReturnType<typeof spawn>;
    private nextId = 1;

    private stdin: NodeJS.WritableStream;
    private stdout: NodeJS.ReadableStream;

    constructor(command: string, args: string[] = []) {
        this.proc = spawn(command, args, {
            stdio: ["pipe", "pipe", "inherit"],
        });

        if (!this.proc.stdin) {
            throw new Error("Failed to spawn MCP server: stdin is null");
        }
        if (!this.proc.stdout) {
            throw new Error("Failed to spawn MCP server: stdout is null");
        }

        this.stdin = this.proc.stdin;
        this.stdout = this.proc.stdout;
    }

    private send(req: MCPRequest): Promise<MCPResponse> {
        return new Promise((resolve) => {
            const json = JSON.stringify(req);
            this.stdin.write(json + "\n");

            const onData = (data: Buffer) => {
                try {
                    const msg = JSON.parse(data.toString()) as MCPResponse;
                    if (msg.id === req.id) {
                        this.stdout.off("data", onData);
                        resolve(msg);
                    }
                } catch {
                    // ignore invalid JSON
                }
            };

            this.stdout.on("data", onData);
        });
    }

    async call(method: string, params?: any) {
        const id = this.nextId++;
        return this.send({ id, method, params });
    }

    async smageCall(
        session: string,
        model: string,
        messages: Array<{ role: string; content: string }>,
        options: Record<string, any> = {},
    ) {
        return this.call("smage.call", {
            session,
            model,
            messages,
            options,
        });
    }

    async listProviders() {
        return this.call("smage.providers");
    }

    async listModels(provider: string) {
        return this.call("smage.models", { provider });
    }
}
