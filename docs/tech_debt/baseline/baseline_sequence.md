# SMAGE Baseline Sequence

A stable reference for system hardening, testing, documentation and improvement cycles.

## 1. Stabilise Runtime Behaviour

Before improving anything, ensure the system behaves consistently across all wrappers and providers.
Wrapper Layer Validation

### Run each wrapper via CLI

- Copilot
- Cursor
- Claude
- Aider
- Opencode

Confirm

- Anchors injected correctly
- CCR applied
- Provider role mapped
- meta.provider matches orchestrator agent
- Output shape stable
- Orchestrator Layer Validation

### Exercise strategies

- single
- round_robin
- fan_out
- auto

Confirm

- Multi-agent fan-out
- ResponseBlender output
- Reliability-first fallback
- Reliability deltas applied
- Provider selection stable

## 2. Lock In Tests Around Current Behaviour

Add or extend tests to capture the current behaviour as the baseline.

### Critical Test Areas

#### Orchestrator

- orchestrator.test.ts
- orchestratorFallback.test.ts

#### ChainRouter

- Multi-provider
- Fallback order
- Telemetry

#### CCR

- Anchor injection
- Compression shaping
- Wrapper Integration:
- New suite: tests/wrap/wrapperIntegration.test.ts

These tests freeze the baseline so future improvements can be measured.

## 3. Document Current Behaviour & Metrics

Create documentation snapshots describing current system behaviour.

### Documentation Areas

- Wrapper profiles
- Orchestrator strategies
- Scoring weights
- Fallback rules
- Reliability model
- CCR stages
- Memory scoring/decay/routing
- Benchmark Snapshot
- Run 5–10 representative prompts per wrapper and record:
- Latency
- Tokens
- Provider chosen
- Reliability score
- Fallback usage

#### Store as

— docs/benchmarks/{date}\_baseline.md

## 4. Freeze Baseline

Tag a git reference:

```Code
bp-sop-baseline-v1
```

This becomes the comparison point for all future improvements.

## 5. Attack Tech Debt One Slice at a Time

For each tech debt item in docs/tech\*debt:

### Step A — Define Target Metrics

Examples:

- Schema factor → fewer schema mismatches
- Provider adaptive → better provider selection
- Relevance tiers → improved CCR shaping

### Step B — Implement Change

Modify only one subsystem at a time:

- providerSelection
- CCR pipeline
- memory routing
- fallback logic
- scoring weights

### Step C — Add/Extend Tests

Ensure new behaviour is covered.

### Step D — Re-run Benchmarks

- Store results as:
  docs/benchmarks/{date}\*{tech_debt_name}\_improvement.md

### Step E — Compare Against Baseline

Only keep changes that show measurable improvement.

## 6. Rinse & Repeat

This BP/SOP loop ensures:
Stability
Measurable improvements
Documentation
Test coverage
Predictable evolution
