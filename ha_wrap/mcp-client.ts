import { spawn } from "child_process";
import { Buffer } from "buffer";

export class MCPClient {
    private proc;

    constructor(cmd: string, args: string[]) {
        this.proc = spawn(cmd, args, { stdio: ["pipe", "pipe", "inherit"] });
    }

    call(method: string, params: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);

            const payload = JSON.stringify({
                jsonrpc: "2.0",
                id,
                method,
                params,
            });
            this.proc.stdin.write(payload + "\n");

            const onData = (data: Buffer) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.id === id) {
                        this.proc.stdout.off("data", onData);
                        resolve(msg.result);
                    }
                } catch (err) {
                    reject(err);
                }
            };

            this.proc.stdout.on("data", onData);
        });
    }
}
