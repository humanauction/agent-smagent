from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
import copy

# ─────────────────────────────────────────────────────────────
#  DATA MODELS
# ─────────────────────────────────────────────────────────────


@dataclass
class SMAGEMessage:
    role: str                     # "system" | "user" | "assistant" | "tool"
    content: str
    name: Optional[str] = None
    meta: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SMAGEOptions:
    ast: bool = False
    maxAge: Optional[int] = None  # ms


@dataclass
class SMAGECompressParams:
    messages: List[SMAGEMessage]
    agent: str
    session: str
    options: Optional[SMAGEOptions] = None

# ─────────────────────────────────────────────────────────────
#  INTERNAL HELPERS
# ─────────────────────────────────────────────────────────────


def token_count(text: str) -> int:
    return len(text.split())


def is_code_block(msg: SMAGEMessage) -> bool:
    return msg.content.strip().startswith("```")


def is_tool_output(msg: SMAGEMessage) -> bool:
    return msg.role == "tool"


def is_rag(msg: SMAGEMessage) -> bool:
    return msg.meta.get("rag") is True


def is_log(msg: SMAGEMessage) -> bool:
    return msg.meta.get("log") is True

# ─────────────────────────────────────────────────────────────
#  REVERSIBLE CACHE (in‑memory for development)
# ─────────────────────────────────────────────────────────────


SMAGE_CACHE: Dict[str, SMAGEMessage] = {}


def cache_store(session: str, index: int, msg: SMAGEMessage) -> str:
    key = f"{session}:{index}"
    SMAGE_CACHE[key] = copy.deepcopy(msg)
    return key

# ─────────────────────────────────────────────────────────────
#  TEMPORARY COMPRESSION (stub)
# ─────────────────────────────────────────────────────────────


def compress_payload(msg: SMAGEMessage, options: SMAGEOptions) -> SMAGEMessage:
    original_content = msg.content
    summary = (
        "[compressed content] "
        + " ".join(original_content.split()[:80])
        + "..."
    )
    new_msg = copy.deepcopy(msg)
    new_msg.content = summary
    new_msg.meta = {**msg.meta, "compressed": True}
    return new_msg

# ─────────────────────────────────────────────────────────────
#  MAIN ENTRYPOINT
# ─────────────────────────────────────────────────────────────


def compress(params: SMAGECompressParams) -> List[SMAGEMessage]:
    messages = params.messages
    session = params.session
    opts = params.options or SMAGEOptions()

    out: List[SMAGEMessage] = []

    for i, msg in enumerate(messages):
        # 1. store original
        cache_store(session, i, msg)

        # 2. User messages: NEVER touch
        if msg.role == "user":
            out.append(msg)
            continue

        # 3. System messages: preserved
        if msg.role == "system":
            out.append(msg)
            continue

        # 4. Code: untouched unless AST compression enabled
        if is_code_block(msg) and not opts.ast:
            out.append(msg)
            continue

        # 5. Short content: skip compression
        if token_count(msg.content) < 200:
            out.append(msg)
            continue

        # 6. Compressible types
        if is_tool_output(msg) or is_rag(msg) or is_log(msg):
            out.append(compress_payload(msg, opts))
            continue

        # 7. Default: leave untouched
        out.append(msg)

    return out
# ─────────────────────────────────────────────────────────────
#  RETRIEVAL (reversible)
# ─────────────────────────────────────────────────────────────


def retrieve_original(session: str, index: int) -> Optional[SMAGEMessage]:
    return SMAGE_CACHE.get(f"{session}:{index}")
