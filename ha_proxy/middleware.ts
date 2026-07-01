import type { Request, Response, NextFunction } from "express";
// this file contains middleware functions for the HA Proxy server, including JSON parsing, error handling.
export function jsonMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        if (req.is("application/json")) {
            req.body = JSON.parse(req.body || "{}");
        }
    } catch {
        return res.status(400).json({ error: "Invalid JSON" });
    }
    next();
}

export function errorMiddleware(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
) {
    res.status(500).json({ error: err.message });
}
