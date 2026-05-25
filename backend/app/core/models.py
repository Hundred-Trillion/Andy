"""ANDY v1 — Pydantic request/response models."""

from __future__ import annotations
from pydantic import BaseModel, Field


class StatusMessage(BaseModel):
    step: str
    status: str = "pending"          # pending | running | complete | error
    timestamp: str = ""


class ReferenceDoc(BaseModel):
    title: str
    source: str
    snippet: str
    score: float = 0.0


class AssemblyComponent(BaseModel):
    id: str
    type: str
    parameters: dict = Field(default_factory=dict)
    position: list[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    rotation: list[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    stl_file: str | None = None
    operation: str = "add"
    target_id: str | None = None


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    chat_history: list[dict] = Field(default_factory=list)
    current_assembly: list[AssemblyComponent] = Field(default_factory=list)
    casual_mode: bool = False
    use_references: bool = False
    isolated_id: str | None = None


class ChatResponse(BaseModel):
    message: str = ""
    model_url: str | None = None
    step_file: str | None = None
    stl_file: str | None = None
    parameters: dict | None = None
    references: list[ReferenceDoc] | None = None
    status_messages: list[StatusMessage] = Field(default_factory=list)
    model_id: str | None = None
    components: list[AssemblyComponent] | None = None


class CadRequest(BaseModel):
    components: list[AssemblyComponent] = Field(default_factory=list)


class CadResult(BaseModel):
    model_id: str
    step_file: str
    stl_file: str
    parameters: dict | None = None
    metadata: dict = Field(default_factory=dict)
    components: list[AssemblyComponent] = Field(default_factory=list)


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
