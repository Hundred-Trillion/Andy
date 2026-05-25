"""ANDY v1 — LangGraph agent state."""

from __future__ import annotations
from typing import TypedDict


class AgentState(TypedDict, total=False):
    user_message: str
    chat_history: list[dict]
    current_assembly: list[dict]
    casual_mode: bool
    use_references: bool
    isolated_id: str | None
    intent: str                    # cad_generation | engineering_question | general
    references: list[dict]
    components: list[dict] | None
    geometry_result: dict | None
    geometry_error: str | None
    response: str
    status_messages: list[dict]
