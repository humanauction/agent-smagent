# SMAGE Hardening Pass — Checklist (v1)

## A stable reference for timeout handling, telemetry consistency, and edge‑case hardening. 0. Preconditions

Before hardening, confirm the baseline is frozen:
All wrappers stable
Orchestrator stable
CCR stable
Memory stable
ResponseBlender stable
Provider adapters stable
Tests passing
Benchmarks captured
If not, run the baseline freeze first.

### 1. Timeout Handling Hardening

Timeouts are the #1 source of instability in multi‑agent systems so i hardened them first.

#### 1.1 Identify all timeout surfaces

Provider adapters
ChainRouter
Retry loop
Fallback
Telemetry
Proxy
CLI

#### 1.2 Standardise timeout error shape

Every provider must emit a unified error object:
kind: "timeout"
providerId
model
session
timestamp
raw (original error)
Jump to: timeout error shape

#### 1.3 Ensure timeout classification is consistent

Provider adapters must classify timeouts identically:
OpenAI
Anthropic
Google
Local
Jump to: timeout classification

#### 1.4 Ensure fallback handles timeouts correctly

Timeout → reliability‑first fallback → bounded retry.
Jump to: timeout fallback

#### 1.5 Ensure reliability tracker applies correct deltas

Timeout should be one of the strongest negative deltas.
Jump to: timeout reliability delta

#### 1.6 Ensure ResponseBlender handles timeout outputs

Timeout responses must not pollute blending.
Jump to: timeout blending

#### 1.7 Add timeout tests

provider-level
chain-level
orchestrator-level
wrapper-level
Jump to: timeout tests

### 2. Telemetry Consistency Hardening

Telemetry is the backbone of reliability, fallback, and debugging.
This is the “pig” you mentioned — and yes, it’s the hardest part.

#### 2.1 Identify all telemetry emitters

provider adapters
chainRouter
chainRetry
chainFallback
chainCache
orchestrator
wrappers
proxy
Jump to: telemetry emitters

#### 2.2 Standardise telemetry event schema

Every event must include:
session
provider
providerId
model
stage
timestamp
meta
Jump to: telemetry schema

#### 2.3 Ensure stage names are consistent

Your current stages are drifting:
"call"
"retry"
"fallback"
"failure"
"normalize"
"selection"
"scoredMessages"
"cache_skip"
Jump to: telemetry stage audit

#### 2.4 Ensure telemetry is emitted exactly once per stage

No duplicates.
No missing events.
Jump to: telemetry emission audit

#### 2.5 Ensure telemetry is strict‑mode safe

No undefined fields.
No optional fields without guards.
Jump to: telemetry strict mode

#### 2.6 Add telemetry tests

Jump to: telemetry tests

### 3. Edge‑Case Hardening

This is where multi‑agent systems usually break.

#### 3.1 Empty content

Jump to: empty content handling

#### 3.2 Malformed provider responses

Jump to: malformed provider handling

#### 3.3 Zero agents

Jump to: zero agents

#### 3.4 All agents fail

Jump to: all agents fail

#### 3.5 Fallback loops

Jump to: fallback loop

#### 3.6 Reliability decay edge cases

Jump to: reliability decay

#### 3.7 CCR edge cases

Jump to: CCR edge cases

#### 3.8 Memory edge cases

Jump to: memory edge cases

### 4. Hardening Pass Completion

When all above are complete:
Run full test suite
Run full benchmark suite
Document results
Tag: bp-sop-hardening-v1
Jump to: hardening completion
