"""ANDY v1 — LangGraph workflow nodes."""

from __future__ import annotations
import json
import logging
import os
import glob
from datetime import datetime
from langchain_openai import ChatOpenAI
from app.core.config import settings
from app.cad.templates import TEMPLATE_REGISTRY
from app.cad.generator import generate_cad
from app.cad.exporter import export_model
from app.rag.retriever import retrieve

logger = logging.getLogger(__name__)


def _llm() -> ChatOpenAI:
    return ChatOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.LLM_MODEL_NAME,
        temperature=0.2,
        max_tokens=4096,
    )


def _llm_json() -> ChatOpenAI:
    """LLM instance with thinking mode disabled for structured JSON output."""
    return ChatOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.LLM_MODEL_NAME,
        temperature=0.2,
        max_tokens=8000,
        model_kwargs={
            "extra_body": {
                "chat_template_kwargs": {"enable_thinking": False}
            }
        },
    )


def _ts() -> str:
    return datetime.now().strftime("%H:%M:%S")


def _add_status(state: dict, step: str, status: str = "complete") -> None:
    state.setdefault("status_messages", [])
    state["status_messages"].append({"step": step, "status": status, "timestamp": _ts()})


# ── Node 1: Parse Intent ───────────────────────────────────────
def parse_intent(state: dict) -> dict:
    """Classify user message intent."""
    if state.get("casual_mode"):
        state["intent"] = "general"
        return state

    # As requested by user, default mode should always try to generate CAD
    state["intent"] = "cad_generation"
    _add_status(state, "Analyzing engineering intent...")
    return state


# ── Node 2: Retrieve References ────────────────────────────────
def retrieve_references(state: dict) -> dict:
    """Query RAG for relevant aerospace docs."""
    if not state.get("use_references", False):
        state["references"] = []
        return state

    _add_status(state, "Retrieving engineering references...", "running")

    docs = retrieve(state["user_message"], top_k=3)
    state["references"] = [d.model_dump() for d in docs]

    _add_status(state, "Retrieving engineering references...")
    return state


# ── Node 3: Plan CAD ──────────────────────────────────────────
def plan_cad(state: dict) -> dict:
    """Use LLM to select templates, extract parameters, and update assembly."""
    _add_status(state, "Generating CAD specification...", "running")

    templates_info = json.dumps({
        name: {"description": t["description"], "parameters": t["parameters"]}
        for name, t in TEMPLATE_REGISTRY.items()
    }, indent=2)

    current_assembly = json.dumps(state.get("current_assembly", []), indent=2)
    history = state.get("chat_history", [])
    history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-4:]])

    refs_text = ""
    for ref in state.get("references", []):
        refs_text += f"\n- {ref['title']}: {ref.get('snippet', '')[:200]}"
        
    # Scan References folder for valid CAD files
    valid_cad_refs = []
    if state.get("use_references", False):
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        ref_dir = os.path.join(project_root, "References")
        if os.path.exists(ref_dir):
            for ext in ('*.step', '*.stp', '*.stl', '*.STEP', '*.STP', '*.STL'):
                for filepath in glob.glob(os.path.join(ref_dir, '**', ext), recursive=True):
                    rel_path = os.path.relpath(filepath, project_root).replace('\\', '/')
                    valid_cad_refs.append(rel_path)
    
    cad_refs_text = "\n".join([f"- {p}" for p in valid_cad_refs[:30]]) if valid_cad_refs else "None"

    isolated_id = state.get("isolated_id")
    focus_instruction = ""
    if isolated_id:
        focus_instruction = f"""
⚠️ ACTIVE HUMAN FOCUS: The human developer has double-clicked and isolated/focused component with ID: "{isolated_id}".
Focus your engineering edits, parameters changes, or boolean features (e.g. cuts, additions) EXCLUSIVELY on this component.
- If the user asks to modify "this component" or "the selected component", modify the parameters/dimensions of "{isolated_id}".
- If the user asks to make an opening, puncture, or cut a feature, add a shape with "operation": "cut" and set its "target_id" to "{isolated_id}".
"""

    prompt = f"""You are a headless automated JSON-generation script. You strictly output raw JSON data.
You are managing a 3D CAD assembly.
The user wants to generate, add, or modify geometry.
Update the current assembly list to fulfill the user's request.

Available templates/primitives:
{templates_info}

Current Assembly (the EXISTING components — you MUST include ALL of these in your response unless the user explicitly asks to remove one):
{current_assembly}
{focus_instruction}

Recent Chat History:
{history_text}

Engineering references:{refs_text}

Available CAD Reference Files (use type "import_reference" with file_path parameter to import these):
{cad_refs_text}

User request: "{state['user_message']}"

CRITICAL INSTRUCTIONS:
1. You MUST output ONLY a raw JSON array. No text, no explanation, no markdown.
2. You MUST PRESERVE all existing components from the Current Assembly unless the user asks to remove them.
3. There is NO LIMIT on the number of components. Output as many as needed.
4. To ADD a part: append a new object. To MODIFY: change its parameters. To REMOVE: omit it.
5. Boolean operations: use "operation" field on a component:
   - "cut": subtracts this shape FROM the previous component with the same "target_id"
   - "add" or omitted: normal union (default)
   Example: to punch a hole through sphere_1, add a cylinder with "operation": "cut", "target_id": "sphere_1"
6. To import a reference file, use type "import_reference" with parameter "file_path".

JSON format:
[
  {{
    "id": "unique_string",
    "type": "template_name",
    "parameters": {{"param1": value}},
    "position": [x, y, z],
    "rotation": [rx, ry, rz],
    "operation": "add",
    "target_id": null
  }}
]

Rules:
- id: short unique string (e.g., "sphere_1", "hole_1").
- position: [X, Y, Z] translation in mm.
- rotation: [X, Y, Z] in degrees. Default [0,0,0].
- operation: "add" (default/union) or "cut" (boolean subtract from target_id).
- target_id: id of the component to cut from (only needed when operation is "cut").
- You CAN modify imported reference models: change their position, rotation, or apply boolean cuts to them.
- When user says "move X", "rotate X", "make X bigger/smaller", update the relevant component's position/rotation/parameters.
- When auto-placing new parts, offset position so they don't overlap existing components (use spacing of ~150mm).
"""

    try:
        resp = _llm_json().invoke(prompt)
        text = resp.content.strip() if resp.content else ""
        
        logger.info(f"LLM response length: {len(text)} chars")
        
        if not text:
            raise ValueError("LLM returned empty content")
        
        import re
        
        # === PHASE 1: Strip <think>...</think> block ===
        # Qwen3 models wrap reasoning in <think>...</think> tags.
        # Everything AFTER </think> is the actual output.
        if '</think>' in text:
            text = text.split('</think>')[-1].strip()
            logger.info(f"After stripping think block: {repr(text[:300])}")
        elif 'Thinking Process:' in text:
            # Older format without tags - try to find JSON after the thinking
            pass
        
        # === PHASE 2: Clean markdown fences if present ===
        blocks = re.findall(r'```(?:json)?\s*(.*?)\s*```', text, flags=re.DOTALL)
        if blocks:
            text = blocks[-1]
            logger.info(f"Extracted from markdown block: {repr(text[:200])}")
        
        # === PHASE 3: If text still doesn't start with [ or {, extract JSON ===
        text = text.strip()
        if text and text[0] not in ('[', '{'):
            # Find the first [ or { that starts valid JSON
            start = -1
            for i, ch in enumerate(text):
                if ch in ('[', '{'):
                    start = i
                    break
            if start >= 0:
                text = text[start:]
        
        logger.info(f"Final text to parse (first 200): {repr(text[:200])}")
                            
        components = json.loads(text)
        if not isinstance(components, list):
            components = [components]
        state["components"] = components
    except Exception as e:
        logger.error(f"CAD planning failed: {e}")
        state["components"] = None
        state["geometry_error"] = f"Failed to parse AI response into valid JSON: {str(e)}"

    _add_status(state, "Generating CAD specification...")
    return state


# ── Node 4: Generate Geometry ─────────────────────────────────
def generate_geometry(state: dict) -> dict:
    """Run CadQuery assembly generation and export files."""
    _add_status(state, "Building parametric geometry...", "running")

    components = state.get("components")

    if not components:
        state["geometry_result"] = None
        if "geometry_error" not in state:
            state["geometry_error"] = "I could not identify any valid CAD shapes to generate from your request. Please specify a primitive (like 'box', 'sphere', 'cylinder') or turn ON Casual Mode to chat."
        _add_status(state, "Building parametric geometry...", "error")
        return state

    try:
        result, metadata = generate_cad(components)
        export_info = export_model(result)
        state["geometry_result"] = {**export_info, **metadata}
        _add_status(state, "Building parametric geometry...")
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(f"Geometry generation failed: {err_msg}")
        state["geometry_result"] = None
        state["geometry_error"] = str(e)

        _add_status(state, f"Geometry error: {e}", "error")

    return state


# ── Node 5: Compose Response ─────────────────────────────────
def compose_response(state: dict) -> dict:
    """Generate final user-facing response."""
    intent = state.get("intent", "general")
    refs = state.get("references", [])
    geo = state.get("geometry_result")

    refs_text = ""
    for i, ref in enumerate(refs):
        refs_text += f"\n[{i+1}] {ref['title']}: {ref.get('snippet', '')[:150]}"

    def _strip_think(text: str) -> str:
        """Strip <think>...</think> blocks from model output."""
        if '</think>' in text:
            text = text.split('</think>')[-1].strip()
        return text

    if intent == "cad_generation" and geo:
        comp_count = geo.get("components", len(state.get("components", [])))
        bb = geo.get("bounding_box", {})
        state["response"] = (
            f"Assembly with {comp_count} component(s) created successfully.\n\n"
            f"Bounding box: {bb.get('x', 0)} × {bb.get('y', 0)} × {bb.get('z', 0)} mm"
        )
    elif intent == "cad_generation" and not geo:
        err = state.get("geometry_error", "Unknown error")
        state["response"] = f"I was unable to generate the requested geometry. Error details: {err}\nPlease try rephrasing your request."
    elif intent == "engineering_question" and refs:
        prompt = f"""Answer this aerospace engineering question concisely using the references provided.

Question: "{state['user_message']}"

References:{refs_text}

Give a clear, technical answer in 2-3 sentences. Cite references as [1], [2], etc."""

        try:
            resp = _llm().invoke(prompt)
            state["response"] = _strip_think(resp.content.strip())
        except Exception:
            state["response"] = "I encountered an error generating a response. Please try again."
    else:
        history = state.get("chat_history", [])
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-4:]])
        
        # Get info about current assembly for context
        components = state.get("components") or state.get("current_assembly") or []
        assembly_info = ""
        if components:
            assembly_info = f"\n\nCurrent CAD Assembly ({len(components)} components):\n"
            for c in components[:5]:
                ctype = c.get('type', 'unknown')
                params = c.get('parameters', {})
                assembly_info += f"- {ctype}: {params}\n"
        
        sys_prompt = f"""You are ANDY, developed by Adithya. You are an aerospace engineering copilot that helps with CAD design and engineering queries. Be friendly, professional, with a slight wit. Keep responses concise.{assembly_info}"""
        
        prompt = f"{sys_prompt}\n\nRecent Chat History:\n{history_text}\n\nUser: \"{state['user_message']}\"\n\nRespond helpfully and concisely."
        
        try:
            resp = _llm().invoke(prompt)
            state["response"] = _strip_think(resp.content.strip())
        except Exception:
            state["response"] = "Hello! I'm ANDY, developed by Adithya. I can help with CAD and answer questions. What would you like to create?"

    return state
