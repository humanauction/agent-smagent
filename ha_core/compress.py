from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
import copy


compressed = smage.compress(
    messages,
    agent="claude",
    session="abc123",
    options={
        "ast": False,
        "max_age": 3600,
    }
)
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

