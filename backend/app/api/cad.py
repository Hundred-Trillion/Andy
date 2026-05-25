"""ANDY v1 — CAD API routes."""

from __future__ import annotations
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.core.models import CadRequest, CadResult
from app.cad.templates import TEMPLATE_REGISTRY
from app.cad.generator import generate_cad
from app.cad.exporter import export_model, get_model_path

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate-cad", response_model=CadResult)
async def generate(request: CadRequest):
    """Direct CAD generation from components."""
    try:
        components_dicts = [c.model_dump() for c in request.components]
        result, metadata = await asyncio.to_thread(generate_cad, components_dicts)
        export_info = await asyncio.to_thread(export_model, result)
        return CadResult(
            model_id=export_info["model_id"],
            step_file=export_info["step_file"],
            stl_file=export_info["stl_file"],
            components=components_dicts,
            metadata=metadata,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{model_id}/download/{fmt}")
async def download_model(model_id: str, fmt: str):
    """Download a generated STEP or STL file."""
    if fmt not in ("step", "stl"):
        raise HTTPException(status_code=400, detail="Format must be 'step' or 'stl'")

    path = get_model_path(model_id, fmt)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Model {model_id}.{fmt} not found")

    return FileResponse(
        str(path),
        filename=f"{model_id}.{fmt}",
        media_type="application/octet-stream",
    )


@router.get("/templates")
async def list_templates():
    """List available CAD templates with parameter schemas."""
    result = []
    for name, t in TEMPLATE_REGISTRY.items():
        result.append({
            "name": name,
            "description": t["description"],
            "parameters": t["parameters"],
        })
    return result


@router.post("/merge")
async def merge_components(request: CadRequest):
    """Merge multiple components into a single boolean union."""
    try:
        if len(request.components) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 components to merge")
        
        components_dicts = [c.model_dump() for c in request.components]
        result, metadata = await asyncio.to_thread(generate_cad, components_dicts)
        export_info = await asyncio.to_thread(export_model, result)
        
        # Return as a single merged component
        merged_comp = {
            "id": f"merged_{export_info['model_id'][:8]}",
            "type": "merged_solid",
            "parameters": {
                "source_count": len(components_dicts),
                "source_ids": ", ".join(c.get("id", "?") for c in components_dicts),
            },
            "position": [0.0, 0.0, 0.0],
            "rotation": [0.0, 0.0, 0.0],
            "stl_file": export_info["stl_file"],
            "operation": "add",
        }
        
        return CadResult(
            model_id=export_info["model_id"],
            step_file=export_info["step_file"],
            stl_file=export_info["stl_file"],
            components=[merged_comp],
            metadata=metadata,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
