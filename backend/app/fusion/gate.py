from __future__ import annotations

from app.core import config


def evaluate_gate(module_flags: dict) -> tuple[bool, str | None, str | None]:
    """Module 9 — gate. A high-confidence guardrail violation forces HOLD
    independently of the fused composite (non-waivable; needs Minister-level nullification)."""
    compliance = module_flags.get("compliance", {})
    photo = module_flags.get("photo", {})

    if compliance.get("critical_hard_fail"):
        return (
            True,
            config.GATE_RULES["compliance"],
            compliance.get("detail") or "A mandatory compliance guardrail failed.",
        )
    if photo.get("high_confidence_photo"):
        return (
            True,
            config.GATE_RULES["photo"],
            "Uploaded photographs are near-identical across distinct works — suspected staged submissions.",
        )
    return False, None, None