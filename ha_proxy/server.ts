import express from "express";
import { jsonMiddleware, errorMiddleware } from "./middleware";
import { handleLLM } from "./router";
import { config } from "./config";
// this file is the entry point for the HA Proxy server, which sets up the Express app and routes.
const app = express();

app.use(express.text({ type: "application/json" }));
app.use(jsonMiddleware);

app.post("/v1/chat/completions", handleLLM);

app.use(errorMiddleware);

app.listen(config.port, () => {
    console.log(`SMAGE proxy running on port ${config.port}`);
});

// export handleLLM for testing purposes
export { handleLLM };
