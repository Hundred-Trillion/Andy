"""ANDY v1 — CAD generation orchestrator."""

from __future__ import annotations
import logging
from app.cad.templates import TEMPLATE_REGISTRY
from app.cad.exporter import export_component

logger = logging.getLogger(__name__)


def generate_cad(components: list[dict]) -> tuple:
    """Generate CAD geometry from a list of components.

    Supports boolean operations:
      - "add" (default): union with the assembly
      - "cut": subtract from a target component (specified by target_id)

    Returns:
        (cq.Workplane result, metadata dict)
    """
    if not components:
        raise ValueError("No components provided to generate.")

    # Store individual shapes by id for boolean operations
    shape_map: dict[str, any] = {}
    build_order: list[str] = []

    # First pass: build all shapes
    for comp in components:
        template_name = comp.get("type", "").lower().replace(" ", "_").replace("-", "_")
        
        # Skip decomposed solids and merged solids - they already have their STL files
        if template_name in ["decomposed_solid", "merged_solid"]:
            comp_id = comp.get("id", f"pre_exp_{len(shape_map)}")
            comp_id = str(comp_id).replace("/", "_").replace("\\", "_")
            # If the component already has an STL file, it's pre-exported
            if comp.get("stl_file"):
                build_order.append(comp_id)
                shape_map[comp_id] = {
                    "shape": None,  # No CQ shape, already exported
                    "comp": comp,
                    "operation": comp.get("operation", "add").lower(),
                    "target_id": comp.get("target_id"),
                    "pre_exported": True,
                }
            continue
        
        if template_name not in TEMPLATE_REGISTRY:
            logger.warning(f"Unknown template '{template_name}'")
            continue

        template = TEMPLATE_REGISTRY[template_name]
        func = template["function"]

        # Build params
        schema = template["parameters"]
        call_params = {}
        for p in schema:
            name = p["name"]
            if name in comp.get("parameters", {}):
                val = comp["parameters"][name]
                if p["type"] == "float":
                    val = float(val)
                elif p["type"] == "int":
                    val = int(val)
                elif p["type"] == "string":
                    val = str(val)
                call_params[name] = val

        try:
            part = func(**call_params)
            
            pos = comp.get("position", [0.0, 0.0, 0.0])
            rot = comp.get("rotation", [0.0, 0.0, 0.0])

            # Ensure numeric
            pos = [float(p) for p in pos]
            rot = [float(r) for r in rot]

            # Apply rotations (X, then Y, then Z)
            if rot[0] != 0: part = part.rotate((0,0,0), (1,0,0), rot[0])
            if rot[1] != 0: part = part.rotate((0,0,0), (0,1,0), rot[1])
            if rot[2] != 0: part = part.rotate((0,0,0), (0,0,1), rot[2])
            
            # Apply translation
            if any(p != 0 for p in pos):
                part = part.translate(pos)

            comp_id = comp.get("id", f"part_{len(shape_map)}")
            comp_id = str(comp_id).replace("/", "_").replace("\\", "_")
            
            shape_map[comp_id] = {
                "shape": part,
                "comp": comp,
                "operation": comp.get("operation", "add").lower(),
                "target_id": comp.get("target_id"),
            }
            build_order.append(comp_id)

        except Exception as e:
            logger.error(f"Failed to generate {template_name}: {e}")
            raise RuntimeError(f"CAD generation failed for {template_name}: {e}") from e

    if not shape_map:
        raise ValueError("Failed to generate any valid geometry from components.")

    # Second pass: apply boolean operations
    for comp_id in build_order:
        entry = shape_map[comp_id]
        operation = entry["operation"]
        target_id = entry["target_id"]

        if operation == "cut" and target_id and target_id in shape_map:
            # Boolean subtract: cut this shape from the target
            target_shape = shape_map[target_id]["shape"]
            tool_shape = entry["shape"]
            try:
                shape_map[target_id]["shape"] = target_shape.cut(tool_shape)
                logger.info(f"Boolean cut: {comp_id} from {target_id}")
            except Exception as e:
                logger.error(f"Boolean cut failed ({comp_id} from {target_id}): {e}")

    # Third pass: export individual STLs and build final union
    final_shape = None
    for comp_id in build_order:
        entry = shape_map[comp_id]
        operation = entry["operation"]
        part = entry["shape"]
        comp = entry["comp"]

        # Pre-exported components (decomposed/merged solids) already have STL files
        if entry.get("pre_exported"):
            continue

        # Export individual component STL
        try:
            comp["stl_file"] = export_component(part, comp_id)
        except Exception as e:
            logger.warning(f"Failed to export {comp_id}: {e}")
            continue

        # Only add non-cut shapes to the final union
        # Cut shapes have already been applied to their targets
        if operation != "cut" and part is not None:
            if final_shape is None:
                final_shape = part
            else:
                try:
                    final_shape = final_shape.union(part)
                except Exception:
                    # Union failed (disjoint shapes etc) — keep final_shape as-is, don't overwrite
                    logger.warning(f"Union skipped for {comp_id} (disjoint shape)")

    if final_shape is None:
        import cadquery as cq
        final_shape = cq.Workplane("XY").box(1, 1, 1)

    # Compute metadata
    try:
        bb = final_shape.val().BoundingBox()
        metadata = {
            "components": len(components),
            "bounding_box": {
                "x": round(bb.xlen, 2),
                "y": round(bb.ylen, 2),
                "z": round(bb.zlen, 2),
            },
        }
    except:
        metadata = {"components": len(components)}

    return final_shape, metadata
