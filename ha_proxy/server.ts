import express from "express";
import { errorMiddleware } from "./middleware.ts";
import { handleLLM } from "./router";
import { config } from "./config";
import { dashboardRouter } from "./dashboard/router";
// this file is the entry point for the HA Proxy server, which sets up the Express app and routes.
async function startServer() {
    try {
        console.log("[proxy] starting SMAGE proxy...");

        const app = express();

        app.use(express.json());

        app.use("/dashboard", dashboardRouter);

        app.post("/v1/chat/completions", handleLLM);

        app.use(errorMiddleware);

        app.listen(config.port, () => {
            console.log(`SMAGE proxy running on port ${config.port}`);
        });
    } catch (err) {
        console.error("[proxy] failed to start:", err);
        process.exit(1);
    }
}

startServer();

// export handleLLM for testing purposes
export { handleLLM };
