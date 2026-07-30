# Tech Debt: Semantic Anchors

## Idea

Build anchor blocks representing:

- user intent
- domain context
- constraints
- memory
- session history

Compress conversation into anchor references instead of raw text.

## Expected Crush

- 20–50% on long sessions

## Difficulty

- High

## Risk

- Medium (anchor drift, misclassification)

## Dependencies

- Basic anchors (`ha_core/transform/anchor.ts`) stable
- CCR Stage 1 (relevance, priority, window)
- Learning engine (`ha_learn`) for anchor refinement

## Milestone Placement

- After CCR Stage 1
- After initial learning engine integration

## Current Blockers

- No semantic anchor taxonomy yet
- No anchor scoring / decay in `ha_learn`
