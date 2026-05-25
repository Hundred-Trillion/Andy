"""ANDY v1 — Decompose API: break a complex model into individual solids."""

from __future__ import annotations
import logging
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import cadquery as cq
from cadquery import exporters
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_SOLID
from OCP.TopoDS import TopoDS
from app.core.config import settings
from app.cad.exporter import export_component

logger = logging.getLogger(__name__)
router = APIRouter()


class DecomposeRequest(BaseModel):
    """Request to decompose a CAD file or component into individual solids."""
    file_path: str | None = None          # Path to STEP/STL file (relative to project root)
    component_id: str | None = None       # Or an existing component ID whose STL to decompose


class SubComponent(BaseModel):
    id: str
    type: str = "decomposed_solid"
    parameters: dict = Field(default_factory=dict)
    position: list[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    rotation: list[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    stl_file: str | None = None
    operation: str = "add"
    target_id: str | None = None


class DecomposeResponse(BaseModel):
    components: list[SubComponent]
    total_solids: int
    source: str


def _get_project_root() -> str:
    """Get the project root directory."""
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))


def _extract_solids_from_shape(shape) -> list:
    """Extract individual TopoDS_Solid objects from a compound shape."""
    solids = []
    explorer = TopExp_Explorer(shape, TopAbs_SOLID)
    while explorer.More():
        solid = TopoDS.Solid_s(explorer.Current())
        solids.append(solid)
        explorer.Next()
    return solids


@router.post("/decompose")
async def decompose(request: DecomposeRequest):
    """Decompose a STEP file or existing component into individual solid bodies."""
    
    try:
        project_root = _get_project_root()
        out_dir = Path(settings.GENERATED_DIR)
        out_dir.mkdir(parents=True, exist_ok=True)
        
        source_label = ""
        cq_shape = None
        
        if request.file_path:
            # Import from file path
            full_path = os.path.join(project_root, request.file_path)
            if not os.path.exists(full_path):
                raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
            
            ext = full_path.lower().rsplit('.', 1)[-1]
            if ext in ['step', 'stp']:
                cq_shape = cq.importers.importStep(full_path)
                source_label = os.path.basename(full_path)
            else:
                raise HTTPException(status_code=400, detail=f"Decompose only supports STEP files (.step, .stp). Got: .{ext}")
        
        elif request.component_id:
            # Try to find the component's STL/STEP in generated dir
            step_candidates = list(out_dir.glob(f"*{request.component_id}*.step"))
            if step_candidates:
                cq_shape = cq.importers.importStep(str(step_candidates[0]))
                source_label = request.component_id
            else:
                raise HTTPException(status_code=404, detail=f"No STEP file found for component: {request.component_id}")
        else:
            raise HTTPException(status_code=400, detail="Provide either file_path or component_id")
        
        if cq_shape is None:
            raise HTTPException(status_code=500, detail="Failed to load the CAD model")
        
        # Get the underlying OCC shape
        occ_shape = cq_shape.val().wrapped
        
        # Extract individual solids
        raw_solids = _extract_solids_from_shape(occ_shape)
        
        if len(raw_solids) <= 1:
            # If only one solid, try to see if we can at least return it
            logger.info(f"Model has {len(raw_solids)} solid(s) — cannot decompose further")
            if len(raw_solids) == 0:
                raise HTTPException(status_code=400, detail="No solid bodies found in the model")
        
        logger.info(f"Decomposing '{source_label}': found {len(raw_solids)} solids")
        
        # Export each solid as a separate component
        sub_components: list[SubComponent] = []
        
        for i, solid in enumerate(raw_solids):
            comp_id = f"decomp_{i+1}_{uuid.uuid4().hex[:4]}"
            
            try:
                # Wrap the OCC solid in a CadQuery Workplane
                cq_solid = cq.Workplane("XY").newObject([cq.Shape(solid)])
                
                # Get bounding box for metadata
                bb = solid.IsNull()
                try:
                    from OCP.Bnd import Bnd_Box
                    from OCP.BRepBndLib import BRepBndLib
                    bbox = Bnd_Box()
                    BRepBndLib.Add_s(solid, bbox)
                    xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()
                    size_x = round(xmax - xmin, 1)
                    size_y = round(ymax - ymin, 1)
                    size_z = round(zmax - zmin, 1)
                    center_x = round((xmin + xmax) / 2, 1)
                    center_y = round((ymin + ymax) / 2, 1) 
                    center_z = round((zmin + zmax) / 2, 1)
                except Exception:
                    size_x = size_y = size_z = 0
                    center_x = center_y = center_z = 0
                
                # Export individual STL
                stl_path = export_component(cq_solid, comp_id)
                
                sub_comp = SubComponent(
                    id=comp_id,
                    type="decomposed_solid",
                    parameters={
                        "source": source_label,
                        "solid_index": i + 1,
                        "size_x": size_x,
                        "size_y": size_y,
                        "size_z": size_z,
                    },
                    position=[0.0, 0.0, 0.0],
                    rotation=[0.0, 0.0, 0.0],
                    stl_file=stl_path,
                )
                sub_components.append(sub_comp)
                logger.info(f"  Solid {i+1}: {size_x}x{size_y}x{size_z}mm → {comp_id}")
                
            except Exception as e:
                logger.warning(f"  Failed to export solid {i+1}: {e}")
                continue
        
        if not sub_components:
            raise HTTPException(status_code=500, detail="Failed to export any solids from the model")
        
        return DecomposeResponse(
            components=sub_components,
            total_solids=len(sub_components),
            source=source_label,
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Decompose failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
