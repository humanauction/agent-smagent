# SMAGE Documentation

## `ha_core/analyze/tokens.ts`

### function `tokenCount`

```ts
function tokenCount(text: string): number {
```

Minimal deterministic token counter for CCR Stage 1.
Always returns a number. Never returns undefined or bigint.

Rules:
- Empty or falsy input → 0
- Split on whitespace
- Filter out empty segments
- Count remaining segments

## `ha_core/call/providers/providerNormalize.ts`

### function `normalizeProviderResponse`

```ts
function normalizeProviderResponse(
```

Normalizes provider output into safe normalizeProviderResponse.
Guarantees:
- role is always "assistant"
- content is always a string
- never returns undefined

## `ha_core/call/providers/timeout.ts`

### const `DEFAULT_TIMEOUT_MS`

```ts
const DEFAULT_TIMEOUT_MS = 15000; // fetch timeout
```

Global timeout constants

### function `timeoutGuard`

```ts
function timeoutGuard<T>(
```

Generic timeout guard for any promise

### function `fetchWithTimeout`

```ts
async function fetchWithTimeout(
```

Unified fetch-with-timeout wrapper

### function `jsonParseWithTimeout`

```ts
async function jsonParseWithTimeout(
```

Unified JSON parse with timeout + size guard

### function `safeTelemetry`

```ts
function safeTelemetry(fn: () => void): void {
```

telemetry wrapper — safe, never blocks provider call

### function `normalizeTimeoutUnknown`

```ts
function normalizeTimeoutUnknown(
```

Unified timeout classification for unknown errors

## `ha_core/memory/memory.ts`

### function `getRelevantAnchorMemory`

```ts
function getRelevantAnchorMemory(
```

Retrieve relevant anchor memory entries for a given agent and user query
- relevance scoring based on keyword overlap, topic hint, and recency
- returns top 5 relevant anchors

### function `remember`

```ts
function remember(agent: string, field: string, value: string): void {
```

Store a memory entry

### function `recall`

```ts
function recall(agent: string, field: string): string | undefined {
```

Retrieve a memory entry

### function `mineMemory`

```ts
function mineMemory(messages: SMAGEMessage[], agent: string): void {
```

Extract memory-worthy facts from messages
- user preferences
- tool results
- assistant statements
- system instructions

### function `injectMemory`

```ts
function injectMemory(agent: string, userQuery: string): SMAGEMessage[] {
```

Inject memory back into the context

## `ha_core/transform/anchor.ts`

### function `extractAnchor`

```ts
function extractAnchor(messages: SMAGEMessage[]): CCRAnchor {
```

Extract pinned messages and last messages of each role from the message history.

### function `applyAnchor`

```ts
function applyAnchor(
```

Build the anchor spine in deterministic order.

### function `mergeAnchor`

```ts
function mergeAnchor(
```

CCR integration helper: inject anchors at top of shaped window.
Stage‑1 compliant:
- tags anchors
- dedupes against shaped messages
- deterministic ordering

## `ha_core/transform/dedupe.ts`

### function `dedupeMessages`

```ts
function dedupeMessages(messages: SMAGEMessage[]): SMAGEMessage[] {
```

CCR Dedupe:

System messages:
- NEVER deduped

User messages:
- Deduped only on exact content match

Assistant / tool messages:
- Aggressive dedupe (stableHash)

Ordering:
- Always preserve original order

Deterministic:
- Same input → same output

## `ha_core/transform/payload.ts`

### function `applyPayloadCompression`

```ts
async function applyPayloadCompression(
```

CCR Payload Compression (Stage 1)

Goals:
- collapse semantic duplicates
- remove filler / low‑signal messages
- preserve anchors and high‑priority content
- enforce soft token budget per message
- keep behaviour deterministic

## `ha_core/transform/priority.ts`

### function `assignPriority`

```ts
function assignPriority(
```

Stage‑1 CCR Priority Assignment

Priority tiers:
- 3: anchor spine + high relevance
- 2: medium relevance
- 1: low relevance
- 0: discardable

Priority is structural, not semantic.
It determines which messages survive window shaping.

## `ha_core/transform/reconstruct.ts`

### function `reconstruct`

```ts
function reconstruct(
```

CCR Reconstruction (Stage 1)

Responsibilities:
- Re‑inject anchor spine at the top
- Preserve windowed message order
- Deduplicate deterministically
- Deterministic + reversible
- Pure (no mutation)

## `ha_core/transform/relevance.ts`

### function `relevanceScore`

```ts
function relevanceScore(
```

Compute relevance score between a message and the last user message.
- Keyword overlap
- Role weighting
- Recency weighting

### function `scoreMessage`

```ts
function scoreMessage(msg: SMAGEMessage): number {
```

CCR Relevance Scoring (MVP)

Goals:
- deterministic
- cheap
- role-aware
- stable across compression
- safe for window shaping

Scoring rules:
- system messages: highest relevance
- last user intent: very high relevance
- last assistant reply: high relevance
- tool messages: medium relevance
- older messages: decreasing relevance

No NLP, no embeddings, no classifiers.
Pure structural relevance.

### function `scoreMessages`

```ts
function scoreMessages(messages: SMAGEMessage[]): SMAGEMessage[] {
```

Score list of messages deterministically.

## `ha_core/transform/window.ts`

### interface `WindowResult`

```ts
interface WindowResult {
```

CCR Window Shaping (Stage 1)

Deterministic, priority‑tiered, relevance‑aware, token‑bounded window.

Invariants:
- Anchors are always preserved.
- Priority tiers enforced.
- Relevance used for trimming.
- Output is ≤ maxTokens.
- Original chronological order preserved.

## `ha_wrap/aider/aiderWrapper.ts`

### class `AiderWrapper`

```ts
class AiderWrapper extends BaseWrapper {
```

AiderWrapper
Extends BaseWrapper and implements provider call via LocalAdapter.

## `ha_wrap/claude/claudeWrapper.ts`

### class `ClaudeWrapper`

```ts
class ClaudeWrapper extends BaseWrapper {
```

ClaudeWrapper
Extends BaseWrapper and implements provider call via AnthropicAdapter.

## `ha_wrap/copilot/copilotWrapper.ts`

### class `CopilotWrapper`

```ts
class CopilotWrapper extends BaseWrapper {
```

CopilotWrapper
Extends BaseWrapper and implements provider call via OpenAIAdapter.

## `ha_wrap/cursor/cursorWrapper.ts`

### class `CursorWrapper`

```ts
class CursorWrapper extends BaseWrapper {
```

CursorWrapper
Extends BaseWrapper and implements provider call via OpenAIAdapter.

## `ha_wrap/opencode/opencodeWrapper.ts`

### class `OpencodeWrapper`

```ts
class OpencodeWrapper extends BaseWrapper {
```

OpencodeWrapper
Extends BaseWrapper and implements provider call via LocalAdapter.
