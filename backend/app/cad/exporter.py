"""ANDY v1 — STEP/STL exporter."""

from __future__ import annotations
import os
import uuid
import logging
from pathlib import Path
import cadquery as cq
from cadquery import exporters
from app.core.config import settings

logger = logging.getLogger(__name__)


def export_model(result, model_id: str | None = None) -> dict:
    """Export CadQuery result to STEP and STL files.

    Returns dict with model_id, file paths, and sizes.
    """
    if model_id is None:
        model_id = str(uuid.uuid4())[:8]

    out_dir = Path(settings.GENERATED_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)

    step_path = out_dir / f"{model_id}.step"
    stl_path = out_dir / f"{model_id}.stl"

    # Export
    exporters.export(result, str(step_path))
    exporters.export(result, str(stl_path))

    logger.info(f"Exported model {model_id}: STEP={step_path}, STL={stl_path}")

    return {
        "model_id": model_id,
        "step_file": str(step_path),
        "stl_file": str(stl_path),
        "file_sizes": {
            "step": os.path.getsize(step_path),
            "stl": os.path.getsize(stl_path),
        },
    }


def get_model_path(model_id: str, fmt: str = "step") -> Path:
    """Get path to an exported model file."""
    return Path(settings.GENERATED_DIR) / f"{model_id}.{fmt}"

def export_component(result, comp_id: str) -> str:
    """Export a single component to STL and return its path."""
    out_dir = Path(settings.GENERATED_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)
    stl_path = out_dir / f"{comp_id}.stl"
    exporters.export(result, str(stl_path))
    return str(stl_path)

