# CCR Stage 1 plan

implementation plan for CCR Stage 1 in ha_core/transform/:

1. Relevance scoring (relevance.ts)
   Goal: assign a relevance score to each message (SMAGEMessage) based on:
    - role (user/system/assistant)
    - recency
    - explicit markers (e.g. “IMPORTANT”)
    - token density
      Output: relevance: number on each message or a parallel structure.
      Used by: priority.ts, window.ts, reconstruct.ts.
2. Priority tiers (priority.ts)
   Goal: map relevance scores into discrete tiers:
   Tier 1: must‑keep
   Tier 2: nice‑to‑have
   Tier 3: discardable unless needed
   Input: relevance scores from relevance.ts.
   Output: tier labels per message.
   Used by: window.ts (selection), later relevance‑tier tech debt.
3. Window shaping (window.ts)
   Goal: select which messages enter the provider window under a token budget.
   Inputs:
    - tiers from priority.ts
    - token estimates from analyze/tokens.ts
    - budget (from options/provider metadata)
      Output: ordered subset of messages to send.
      Used by: ccr.ts and provider call path.
4. Reconstruction (reconstruct.ts)
   Goal: reconstruct a coherent view of the conversation from:
    - compressed window
    - anchors
    - dedupe decisions
    - Inputs:
    - original messages
    - shaped window
    - anchor references
      Output: structure suitable for logging and potential replay.
      Used by: reversible logging, learning engine.
5. Payload shaping (payload.ts)
   Goal: apply basic compression to message content:
    - trim boilerplate
    - collapse repeated phrases
    - apply compressors/basic.ts where safe
      Inputs:
    - messages selected by window.ts
      Output: compressed message contents.
      Used by: final provider payload.
6. Context shaping (context.ts)
   Goal: assemble:
    - system messages
    - anchors
    - memory snippets
    - selected user/assistant messages
      into a single coherent context block.
      Inputs:
    - anchors
    - memory (ha_core/memory)
    - windowed messages
      Output: final context structure passed into provider adapters.
7. Integration (ccr.ts)
   Wire the above into a single CCR pipeline:
    - start from SMAGEMessage[]
    - apply anchors + dedupe
    - compute relevance
    - assign tiers
    - shape window under budget
    - compress payload
    - assemble context
    - return shaped messages + metadata
      This is what applyCCR should expose to the rest of the system.
8. Tests (minimum)
   For Stage 1 to be “done”:
   unit tests for: - relevance.ts - priority.ts - window.ts - reconstruct.ts - payload.ts - context.ts
   integration test for ccr.ts:
   given a synthetic conversation, assert: - fewer tokens - Tier 1 always kept - reconstruction preserves semantics - logs contain both original + shaped views
