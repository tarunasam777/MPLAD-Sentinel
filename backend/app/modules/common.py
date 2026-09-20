from __future__ import annotations

from dataclasses import dataclass, field

from app.db.models import Case


def clamp(v: float, lo: float = 0, hi: float = 100) -> int:
    return int(round(max(lo, min(hi, v))))


@dataclass
class ModuleResult:
    module: str
    sub_score: int
    description: str
    triggered: bool = False
    evidence: dict | None = None
    flags: dict = field(default_factory=dict)


@dataclass
class ModuleContext:
    db: object
    case: Case
    facts: dict

    def facts_for(self, module: str) -> dict:
        return self.facts.get(module) or {}