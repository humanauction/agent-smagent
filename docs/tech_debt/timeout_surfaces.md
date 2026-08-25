# SMAGE Timeout Surfaces — Full System Enumeration

## 1. Provider Adapters (Primary Timeout Surface)

first and most common timeout points — each adapter performs network I/O, streaming, and response parsing.
OpenAIAdapter timeouts
AnthropicAdapter timeouts
GoogleAdapter timeouts
LocalAdapter timeouts
Timeout types:
request timeout
streaming timeout
provider‑side timeout
response parse timeout
network stall

## 2. ChainRouter (Multi‑Provider Routing)

The router fans out calls to multiple providers — each call can timeout independently.
ChainRouter timeouts
Timeout types:
per‑provider call timeout
global router timeout
scoring timeout
selection timeout

## 3. ChainRetry (Retry Loop)

Retries amplify timeout behaviour — if not bounded, they can cascade.
ChainRetry timeouts
Timeout types:
retry loop timeout
exponential backoff misconfiguration
retry exhaustion timeout

## 4. ChainFallback (Fallback Logic)

Fallback is triggered by timeouts — but fallback itself can timeout.
ChainFallback timeouts
Timeout types:
fallback provider timeout
fallback loop timeout
fallback exhaustion timeout

## 5. ChainCache (Cache Layer)

Cache operations can timeout under load or slow storage.
ChainCache timeouts
Timeout types:
cache read timeout
cache write timeout
cache skip timeout

## 6. Orchestrator (Multi‑Agent Execution)

The orchestrator coordinates the entire multi‑agent pipeline.
Orchestrator timeouts
Timeout types:
multi-agent fan-out timeout
blending timeout
scoring timeout
CCR shaping timeout

## 7. CCR Pipeline (Compression + Reconstruction)

Large message sets can cause slow compression or reconstruction.
CCR timeouts
Timeout types:
anchor extraction timeout
dedupe timeout
windowing timeout
reconstruction timeout
payload compression timeout

## 8. Memory System (Scoring + Decay + Routing)

Memory operations can be slow when many entries exist.
Memory timeouts
Timeout types:
memory scoring timeout
memory decay timeout
memory routing timeout

## 9. Proxy Layer (HTTP Boundary)

The proxy is a timeout surface because it sits between CLI and wrappers.
Proxy timeouts
Timeout types:
request forwarding timeout
dashboard rendering timeout
provider test endpoint timeout

## 10. CLI Layer (User-Facing Commands)

CLI commands can timeout if wrapper calls stall.
CLI timeouts
Timeout types:
wrapper call timeout
MCP client timeout
docs generation timeout

## 11. MCP Tools (Compression, Retrieval, Stats)

These tools operate on large payloads and can stall.
MCP timeouts
Timeout types:
retrieval timeout
compression timeout
stats timeout
