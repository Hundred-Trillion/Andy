"""ANDY v1 — LangGraph agent workflow."""

from __future__ import annotations
import logging
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes import (
    parse_intent,
    retrieve_references,
    plan_cad,
    generate_geometry,
    compose_response,
)

logger = logging.getLogger(__name__)


def _route_after_intent(state: AgentState) -> str:
    """Route based on classified intent."""
    intent = state.get("intent", "general")
    if intent == "cad_generation":
        return "retrieve_references"
    elif intent == "engineering_question":
        return "retrieve_references_only"
    else:
        return "compose_response"


def build_graph() -> StateGraph:
    """Build and compile the ANDY agent graph."""
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("parse_intent", parse_intent)
    graph.add_node("retrieve_references", retrieve_references)
    graph.add_node("retrieve_references_only", retrieve_references)
    graph.add_node("plan_cad", plan_cad)
    graph.add_node("generate_geometry", generate_geometry)
    graph.add_node("compose_response", compose_response)

    # Entry
    graph.set_entry_point("parse_intent")

    # Conditional routing after intent
    graph.add_conditional_edges("parse_intent", _route_after_intent)

    # CAD path: retrieve → plan → generate → compose
    graph.add_edge("retrieve_references", "plan_cad")
    graph.add_edge("plan_cad", "generate_geometry")
    graph.add_edge("generate_geometry", "compose_response")

    # Question path: retrieve → compose
    graph.add_edge("retrieve_references_only", "compose_response")

    # End
    graph.add_edge("compose_response", END)

    return graph


# Compiled graph singleton
_compiled = None


def get_graph():
    global _compiled
    if _compiled is None:
        _compiled = build_graph().compile()
    return _compiled


def run_agent(state_input: dict) -> dict:
    """Run the full agent pipeline."""
    graph = get_graph()
    initial_state: AgentState = {
        "user_message": state_input.get("user_message", ""),
        "chat_history": state_input.get("chat_history", []),
        "current_assembly": state_input.get("current_assembly", []),
        "casual_mode": state_input.get("casual_mode", False),
        "use_references": state_input.get("use_references", False),
        "isolated_id": state_input.get("isolated_id", None),
        "intent": "",
        "references": [],
        "components": None,
        "geometry_result": None,
        "response": "",
        "status_messages": [],
    }

    result = graph.invoke(initial_state)
    return result
