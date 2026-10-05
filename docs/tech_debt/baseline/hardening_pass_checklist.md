# SMAGE Hardening Pass Checklist

This checklist tracks work after the CCR baseline. Check an item only when the implementation and its tests or operational evidence have been reviewed. Passing the general test suite alone does not complete every item below.

## 0. Baseline preconditions

- [ ] Approved baseline benchmark is committed and its PR check passed.
- [ ] Baseline reference commit/tag is recorded.
- [ ] Full test suite and build passed on the reference revision.
- [ ] Wrapper, orchestrator, CCR, memory, response blending, and provider behavior have recorded validation evidence.
- [ ] Benchmark corpus and runtime/toolchain are recorded.

## 1. Timeout handling

- [ ] Inventory timeout behavior at provider adapters, chain routing/retry/fallback, orchestrator, CCR, memory, proxy, CLI, and MCP boundaries.
- [ ] Verify the provider error contract includes type, provider, model, session, timestamp, cause, retryability, and timeout indication where applicable.
- [ ] Verify timeout classification consistently across OpenAI, Anthropic, Google, and Local adapters.
- [ ] Verify retry and fallback are bounded and do not loop after timeout.
- [ ] Verify reliability scoring applies the intended timeout penalty.
- [ ] Verify response blending excludes timeout/error payloads appropriately.
- [ ] Add or confirm provider-, chain-, orchestrator-, wrapper-, proxy-, CLI-, and MCP-level timeout tests.

## 2. Telemetry consistency

- [ ] Inventory telemetry emitters and their event names.
- [ ] Document the required common fields and which fields are conditional.
- [ ] Check stage names and provider/session identity are consistent across emitters.
- [ ] Verify one intended event is emitted per stage, including error paths.
- [ ] Verify strict-mode safety and handling of optional/undefined values.
- [ ] Add tests for event schemas, ordering, duplicates, and failure paths.

## 3. Edge-case hardening

- [ ] Empty input/content.
- [ ] Malformed provider responses.
- [ ] Zero configured agents.
- [ ] All agents fail.
- [ ] Retry and fallback loops.
- [ ] Reliability decay boundaries.
- [ ] CCR oversized, empty, and malformed inputs.
- [ ] Memory empty, expired, and high-volume states.

## 4. Completion criteria

- [ ] Full build and test suite pass.
- [ ] Relevant integration suites pass and are documented.
- [ ] Full deterministic benchmark has been reviewed; performance results are recorded separately.
- [ ] Changes and limitations are documented.
- [ ] Tag `bp-sop-hardening-v1` only after all applicable checklist items are complete.

## Current evidence boundary

The repository contains shared timeout helpers and uses them in providers, the chain router, orchestrator, CCR compression, proxy, CLI, and MCP paths. This confirms implementation surfaces exist; it does not complete the consistency, bounded-retry, telemetry, or edge-case checks above. Track results per checkbox rather than treating the inventory as proof of completion.
