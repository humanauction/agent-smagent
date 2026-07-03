# SMAGE Documentation

## `ha_core/memory/memory.ts`

### interface `MemoryEntry`

```ts
interface MemoryEntry
```

Memory entry:

- key: string (agent or global)
- value: string (fact, summary, preference)
- ts: timestamp

### function `remember`

```ts
function remember
```

In-memory store (TODO: embeddings, external storage, database e.g. replace with Redis/SQLite)
/
const MEMORY = new Map<string, MemoryEntry>();

/\*\*
Normalize memory keys:

- agent-specific: "agent:<agent>"

- global: "global"
  /
  function keyFor(agent: string, field: string): string {
  return `${agent}:${field}`;
  }

/\*\*
Store a memory entry

### function `recall`

```ts
function recall
```

Retrieve a memory entry

### function `mineMemory`

```ts
function mineMemory
```

Extract memory-worthy facts from messages

- user preferences
- tool results
- assistant statements
- system instructions

### function `injectMemory`

```ts
function injectMemory
```

Inject memory back into the context

## `ha_core/output/reducer.ts`

### function `reduceOutput`

```ts
function reduceOutput
```

Reduce verbosity in assistant/tool messages.

- Collapse repeated whitespace
- Remove filler sentences
- Trim long paragraphs
- Keep first N sentences
- Keep last N sentences

### function `applyOutputReduction`

```ts
function applyOutputReduction
```

Apply reduction to all messages in the final output.

## `ha_core/transform/dedupe.ts`

### function `dedupeMessages`

```ts
function dedupeMessages
```

Stable hash for dedupe.

- Ignores metadata (meta)
- Ignores name
- Ignores whitespace differences
- Role + normalized content
  /
  function stableHash(msg: SMAGEMessage): string {
  const normalized = msg.content.replace(/\s+/g, " ").trim().toLowerCase();

return `${msg.role}:${normalized}`;
}

/\*\*
Role-aware dedupe:

- System messages: dedupe never
- User messages: dedupe ONLY exact repeats
- Assistant messages: dedupe aggressive
- Tool messages: dedupe aggressive
- Logs/RAG: dedupe aggressive

## `ha_core/transform/relevance.ts`

### function `relevanceScore`

```ts
function relevanceScore
```

Extract keywords from a message.
Lowercase, remove punctuation, split on whitespace.
/
function extractKeywords(text: string): Set<string> {
return new Set(
text
.toLowerCase()
.replace(/[^\w\s]/g, "")
.split(/\s+/)
.filter(Boolean),
);
}

/\*\*
Compute relevance score between a message and the last user message.

- Keyword overlap
- Role weighting
- Recency weighting
