import { handleLLM } from "../../ha_proxy/server";
import express from "express";

// this file contains the SMAGE proxy server start command.

// this function starts the SMAGE proxy server, listens for incoming requests, and forwards to appropriate handler
export async function startProxy() {
    const app = express();
    app.use(express.json());

    app.post("/v1/chat/completions", handleLLM);

    app.listen(9999, () => {
        console.log("SMAGE proxy running on http://localhost:9999");
    });
}
