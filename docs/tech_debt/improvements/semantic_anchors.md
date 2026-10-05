# Improvement Proposal: Semantic Anchors

Status: partial structural support exists. Basic role anchors, summary hints, a memory prototype, and exact-text anchor fusion are implemented. A validated semantic anchor taxonomy and measured anchor summarization are not.

## Hypothesis

Compact, provenance-aware representations of intent, domain context, constraints, and relevant memory may help long-session context retention. The earlier estimate of 20–50% token reduction is an unvalidated hypothesis.

## Current gaps

- `anchor.ts` selects role-based source messages; it does not extract a tested taxonomy of semantic facts.
- `anchorSemanticFusion.ts` groups normalized identical text, not semantically similar content.
- `semantic.ts` uses deterministic local embedding behavior and should not be treated as validated semantic understanding.
- `ha_learn` does not yet establish a tested feedback loop that updates CCR anchors.
- Memory storage is process-local and timestamped; persistence, isolation, expiry, and deletion need explicit contracts.

## Evaluation plan

Create labeled conversations with required intent, constraints, and facts. Measure extraction precision/recall, source provenance, reconstruction retention, token overhead, and behavior when extraction confidence is low. Keep original text available for exact reconstruction and provide a safe fallback when semantic extraction is uncertain.
