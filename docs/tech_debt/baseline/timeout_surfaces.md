# Timeout Surface Inventory

This is a source-level inventory for the hardening checklist, not a certification that timeout behavior is uniform or fully tested.

## Shared implementation

`ha_core/call/providers/timeout.ts` provides `timeoutGuard`, `fetchWithTimeout`, `jsonParseWithTimeout`, `normalizeTimeoutUnknown`, and `safeTelemetry`. `ha_core/call/providers/errors.ts` defines `ProviderError` and provider error classification. The current error shape uses `type`, `provider`, `model`, `session`, `timestamp`, `cause`, retry fields, and an optional timeout boolean.

## Known call sites

| Surface | Current code | Verification still needed |
| --- | --- | --- |
| Provider adapters | OpenAI, Anthropic, Google, and Local use shared timeout/error helpers | Consistent classification, streaming behavior, error response bodies, and retry policy |
| Chain router | `chainRouter.ts` wraps provider calls, chain duration, and retry delays | Per-provider/global boundary interactions and retry exhaustion |
| Provider routing | `router.ts` adjusts retry delay based on provider errors | Bounded retries and accurate timeout classification |
| Orchestrator | `orchestrator.ts` guards fan-out, CCR, and provider calls | Cancellation and cleanup when a guard expires |
| CCR | `ccr/pipeline.ts` guards payload compression | Other stages and mutation/partial results after timeout |
| Proxy | `ha_proxy/routing/router.ts` guards shaping and forwarding | HTTP cancellation and response mapping |
| MCP | `ha_mcp/server.ts` and `ha_mcp/tools/compress.ts` guard tool operations | JSON-RPC timeout shape and cancellation |
| CLI | `ha_cli/main.ts` and `ha_cli/mcp_client.ts` use timeout guards/timers | Consistent surfaced error and process cleanup |
| Memory and learning | No complete timeout policy is established by this inventory | Assess before adding async persistence or remote services |

## Known gaps to verify

- `timeoutGuard` rejects the wrapper promise but does not itself cancel the underlying work.
- `jsonParseWithTimeout` currently classifies failures from parsing/size handling through its timeout error path; confirm the intended distinction between parse, content-size, and timeout errors.
- `ProviderError.classifyRetry` marks `timeout` non-retryable, while several call paths have separate retry behavior. Check the combined policy before changing it.
- `ha_wrap/providerFallback.ts` has its own timeout detection logic; compare it with `ProviderError` handling.
- Confirm every boundary emits telemetry once and preserves provider/session context.

Use the linked hardening checklist to turn these observations into tests and completion evidence.
