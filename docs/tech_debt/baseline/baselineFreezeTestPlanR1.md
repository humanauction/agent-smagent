# Baseline Freeze Test Plan (Round‑1)

This is the official SMAGE baseline‑freeze plan.

## 1️⃣ Test Matrix

### Run CCR pipeline with

- baselineFreeze: true
- baselineFreeze: false

### Across

- 3 providers: openai, anthropic, local
- 3 intents: debug, explain, summarize
- 3 message sets: short, medium, long

#### Total: 27 runs

## 2️⃣ Expected Freeze Behavior

### With baselineFreeze: true

- provider‑specific shaping disabled
- window size fixed
- priority shaping fixed
- compression deterministic
- reducer deterministic
- chain routing deterministic
- semantic fusion deterministic
- continuity scoring deterministic
- Outputs must be byte‑for‑byte identical across runs.

## 3️⃣ Tests to write

### A. CCR Pipeline Freeze Test

#### File

- tests/transform/ccrPipeline.freeze.test.ts

#### Assertions

- shaped.windowed identical across runs
- shaped.reconstructed identical
- shaped.compressed identical
- shaped.reduced.content identical

### B. Chain Router Freeze Test

#### File1

- tests/chain/chainRouter.freeze.test.ts

#### Assertions1

- chain.chain identical
- chain.getTelemetry() identical
- chain.call() output identical

### C. Provider Selection Freeze Test

#### File2

- tests/orchestrator/orchestrator.freeze.test.ts

#### Assertions2

- selected provider identical
- selected strategy identical
- providerMeta identical

### D. Semantic Fusion Freeze Test

#### File3

- tests/transform/anchorSemanticFusion.freeze.test.ts

#### Assertions3

- fused anchors identical
- fusedCount identical
- fusedSemantic flag identical

### E. Relevance Freeze Test

#### File4

- tests/transform/relevance.freeze.test.ts

#### Assertions4

- relevance scores identical
- continuity flags identical
- topicMatch identical
- intentMatch identical

## 4️⃣ Freeze Diff Checker

### Add a helper

```Code
tests/utils/diffFreeze.ts
```

Compare:

```ts
expect(JSON.stringify(output1)).toBe(JSON.stringify(output2));
```

## 5️⃣ Freeze Snapshot

Store baseline outputs in:

```Code
tests/\_snapshots/baseline/
```

Use Vitest snapshots.

## 6️⃣ Freeze Mode Activation

Ensure:

```ts
agent.options.baselineFreeze = true;
```

in mockConfig.ts.
