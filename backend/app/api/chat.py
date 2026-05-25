"""ANDY v1 — Chat API route."""

from __future__ import annotations
import json
import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.core.models import ChatRequest, ChatResponse, StatusMessage, ReferenceDoc

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    """Main chat endpoint. Runs LangGraph agent and streams status via SSE."""

    async def event_stream():
        try:
            # Run agent in thread pool (LangGraph is sync)
            from app.agents.graph import run_agent
            state_input = {
                "user_message": request.message,
                "chat_history": request.chat_history,
                "current_assembly": [c.model_dump() for c in request.current_assembly],
                "casual_mode": request.casual_mode,
                "use_references": request.use_references,
                "isolated_id": request.isolated_id,
            }
            result = await asyncio.to_thread(run_agent, state_input)

            # Stream status messages
            for status in result.get("status_messages", []):
                event = {"type": "status", "data": status}
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0.1)

            # Build final response
            geo = result.get("geometry_result")
            refs = result.get("references", [])

            response = ChatResponse(
                message=result.get("response", ""),
                model_id=geo.get("model_id") if geo else None,
                step_file=geo.get("step_file") if geo else None,
                stl_file=geo.get("stl_file") if geo else None,
                parameters=result.get("components")[0].get("parameters") if result.get("components") else None,
                references=[ReferenceDoc(**r) for r in refs] if refs else None,
                status_messages=[StatusMessage(**s) for s in result.get("status_messages", [])],
                components=result.get("components"),
            )

            event = {"type": "response", "data": response.model_dump()}
            yield f"data: {json.dumps(event)}\n\n"

        except Exception as e:
            logger.error(f"Chat error: {e}")
            event = {"type": "error", "data": {"message": str(e)}}
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
