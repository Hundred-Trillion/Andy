"""ANDY v1 — CadQuery parametric templates for aerospace parts."""

from __future__ import annotations
import math
import os
import cadquery as cq


# ────────────────────────────────────────────────────────────────
# 1. SWEPT FIN
# ────────────────────────────────────────────────────────────────
def create_swept_fin(
    root_chord: float = 180,
    tip_chord: float = 80,
    span: float = 250,
    thickness: float = 4,
    sweep_angle: float = 30,
) -> cq.Workplane:
    """Trapezoidal swept fin.

    Args:
        root_chord: Root chord length in mm.
        tip_chord: Tip chord length in mm.
        span: Fin span (height) in mm.
        thickness: Fin thickness in mm.
        sweep_angle: Leading-edge sweep in degrees.
    """
    sweep_offset = span * math.tan(math.radians(sweep_angle))

    pts = [
        (0, 0),
        (root_chord, 0),
        (sweep_offset + tip_chord, span),
        (sweep_offset, span),
    ]

    result = (
        cq.Workplane("XY")
        .polyline(pts)
        .close()
        .extrude(thickness)
    )
    return result


# ────────────────────────────────────────────────────────────────
# 2. TUBE (hollow cylinder)
# ────────────────────────────────────────────────────────────────
def create_tube(
    outer_diameter: float = 50,
    inner_diameter: float = 44,
    length: float = 200,
) -> cq.Workplane:
    """Hollow tube / cylindrical section.

    Args:
        outer_diameter: Outer diameter in mm.
        inner_diameter: Inner diameter in mm.
        length: Length in mm.
    """
    result = (
        cq.Workplane("XY")
        .circle(outer_diameter / 2)
        .circle(inner_diameter / 2)
        .extrude(length)
    )
    return result


# ────────────────────────────────────────────────────────────────
# 3. NOSE CONE
# ────────────────────────────────────────────────────────────────
def create_nose_cone(
    diameter: float = 60,
    length: float = 150,
    shape: str = "ogive",
) -> cq.Workplane:
    """Axisymmetric nose cone.

    Args:
        diameter: Base diameter in mm.
        length: Nose cone length in mm.
        shape: Profile type — 'ogive', 'conical', or 'parabolic'.
    """
    radius = diameter / 2

    if shape == "conical":
        result = (
            cq.Workplane("XZ")
            .moveTo(0, 0)
            .lineTo(radius, 0)
            .lineTo(0, length)
            .close()
            .revolve(360, (0, 0, 0), (0, 1, 0))
        )
    elif shape == "parabolic":
        pts = []
        n = 20
        for i in range(n + 1):
            y = length * i / n
            r = radius * math.sqrt(1 - (y / length))
            pts.append((r, y))
        pts.append((0, length))

        result = (
            cq.Workplane("XZ")
            .moveTo(0, 0)
            .lineTo(radius, 0)
            .spline(pts[1:])
            .close()
            .revolve(360, (0, 0, 0), (0, 1, 0))
        )
    else:  # ogive
        rho = (radius**2 + length**2) / (2 * radius)
        center_x = radius - rho

        pts = []
        n = 30
        for i in range(n + 1):
            y = length * i / n
            r = math.sqrt(rho**2 - (length - y) ** 2) + center_x
            r = max(r, 0.01)
            pts.append((r, y))

        result = (
            cq.Workplane("XZ")
            .moveTo(0, 0)
            .lineTo(radius, 0)
            .spline(pts[1:])
            .lineTo(0, length)
            .close()
            .revolve(360, (0, 0, 0), (0, 1, 0))
        )

    return result


# ────────────────────────────────────────────────────────────────
# 4. MOUNTING BRACKET
# ────────────────────────────────────────────────────────────────
def create_mounting_bracket(
    width: float = 60,
    height: float = 80,
    thickness: float = 5,
    hole_count: int = 4,
    hole_diameter: float = 6,
) -> cq.Workplane:
    """L-shaped mounting bracket with holes.

    Args:
        width: Bracket width (extrusion depth) in mm.
        height: Overall height in mm.
        thickness: Wall thickness in mm.
        hole_count: Number of holes per face.
        hole_diameter: Hole diameter in mm.
    """
    leg_h = height * 0.6
    base_l = height * 0.5

    result = (
        cq.Workplane("YZ")
        .moveTo(0, 0)
        .lineTo(base_l, 0)
        .lineTo(base_l, thickness)
        .lineTo(thickness, thickness)
        .lineTo(thickness, leg_h)
        .lineTo(0, leg_h)
        .close()
        .extrude(width)
    )

    # Holes on base face
    result = (
        result
        .faces("<Y")
        .workplane()
        .pushPoints([(width * 0.25, base_l * 0.5), (width * 0.75, base_l * 0.5)])
        .hole(hole_diameter)
    )

    return result


# ────────────────────────────────────────────────────────────────
# 5. BULKHEAD
# ────────────────────────────────────────────────────────────────
def create_bulkhead(
    diameter: float = 100,
    thickness: float = 5,
    hole_count: int = 8,
    hole_diameter: float = 8,
    hole_circle_diameter: float = 70,
) -> cq.Workplane:
    """Circular bulkhead disc with bolt-hole pattern.

    Args:
        diameter: Outer diameter in mm.
        thickness: Disc thickness in mm.
        hole_count: Number of evenly spaced holes.
        hole_diameter: Diameter of each hole in mm.
        hole_circle_diameter: Bolt circle diameter in mm.
    """
    result = (
        cq.Workplane("XY")
        .circle(diameter / 2)
        .extrude(thickness)
        .faces(">Z")
        .workplane()
        .polarArray(hole_circle_diameter / 2, 0, 360, hole_count)
        .hole(hole_diameter)
    )
    return result


# ────────────────────────────────────────────────────────────────
# 6. RECTANGULAR PLATE
# ────────────────────────────────────────────────────────────────
def create_rectangular_plate(
    length: float = 200,
    width: float = 100,
    thickness: float = 5,
    corner_radius: float = 3,
) -> cq.Workplane:
    """Flat rectangular plate with rounded corners and corner holes.

    Args:
        length: Plate length in mm.
        width: Plate width in mm.
        thickness: Plate thickness in mm.
        corner_radius: Fillet radius on corners in mm.
    """
    margin = 10
    hole_dia = 6

    result = (
        cq.Workplane("XY")
        .box(length, width, thickness)
        .edges("|Z")
        .fillet(corner_radius)
        .faces(">Z")
        .workplane()
        .rect(length - 2 * margin, width - 2 * margin, forConstruction=True)
        .vertices()
        .hole(hole_dia)
    )
    return result


# ────────────────────────────────────────────────────────────────
# 7. CYLINDER
# ────────────────────────────────────────────────────────────────
def create_cylinder(
    diameter: float = 50,
    height: float = 100,
) -> cq.Workplane:
    """Solid cylinder.
    Args:
        diameter: Outer diameter in mm.
        height: Height in mm.
    """
    return cq.Workplane("XY").circle(diameter / 2).extrude(height)

# ────────────────────────────────────────────────────────────────
# 8. CONE
# ────────────────────────────────────────────────────────────────
def create_cone(
    bottom_diameter: float = 50,
    top_diameter: float = 0,
    height: float = 50,
) -> cq.Workplane:
    """Solid truncated or pointed cone.
    Args:
        bottom_diameter: Base diameter in mm.
        top_diameter: Top diameter in mm (0 for pointed).
        height: Height in mm.
    """
    return (
        cq.Workplane("XY")
        .circle(bottom_diameter / 2)
        .workplane(offset=height)
        .circle(max(top_diameter / 2, 0.001))
        .loft()
    )

# ────────────────────────────────────────────────────────────────
# 9. BOX
# ────────────────────────────────────────────────────────────────
def create_box(
    length: float = 100,
    width: float = 50,
    height: float = 20,
) -> cq.Workplane:
    """Solid rectangular box.
    Args:
        length: Length in mm (X).
        width: Width in mm (Y).
        height: Height in mm (Z).
    """
    return cq.Workplane("XY").box(length, width, height)

# ────────────────────────────────────────────────────────────────
# 10. SPHERE
# ────────────────────────────────────────────────────────────────
def create_sphere(
    radius: float = 25,
) -> cq.Workplane:
    """Solid sphere.
    Args:
        radius: Sphere radius in mm.
    """
    return cq.Workplane("XY").sphere(radius)

# ────────────────────────────────────────────────────────────────
# 11. TORUS
# ────────────────────────────────────────────────────────────────
def create_torus(
    major_radius: float = 50,
    minor_radius: float = 10,
) -> cq.Workplane:
    """Solid torus.
    Args:
        major_radius: Distance from center to tube center.
        minor_radius: Radius of the tube.
    """
    # CadQuery doesn't have a direct torus, so we revolve a circle
    return (
        cq.Workplane("XZ")
        .center(major_radius, 0)
        .circle(minor_radius)
        .revolve(360, (-major_radius, 0, 0), (-major_radius, 1, 0))
    )

# ────────────────────────────────────────────────────────────────
# 12. WEDGE
# ────────────────────────────────────────────────────────────────
def create_wedge(
    dx: float = 50,
    dy: float = 50,
    dz: float = 50,
    xmin: float = 0,
    zmin: float = 0,
    xmax: float = 0,
    zmax: float = 0,
) -> cq.Workplane:
    """Solid wedge.
    Args:
        dx: Length in X
        dy: Width in Y
        dz: Height in Z
        xmin, zmin, xmax, zmax: Offsets for the wedge shape.
    """
    return cq.Workplane("XY").wedge(dx, dy, dz, xmin, zmin, xmax, zmax)

# ────────────────────────────────────────────────────────────────
# 13. IMPORT REFERENCE (copy-on-import: originals stay untouched)
# ────────────────────────────────────────────────────────────────
def create_import_reference(
    file_path: str = "",
) -> cq.Workplane:
    """Import an existing CAD reference file from the References folder.
    
    The file is COPIED to the generated/ directory first, so the original
    reference stays pristine. All modifications happen on the copy.
    
    Args:
        file_path: Relative path to the STEP or STL file (e.g. References/rocket/part.step).
    """
    import shutil
    import uuid
    
    if not file_path:
        return cq.Workplane("XY")
    
    # Resolve relative to the project root
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    full_path = os.path.join(project_root, file_path)
    
    if not os.path.exists(full_path):
        raise FileNotFoundError(f"Reference file not found: {file_path}")

    ext = full_path.lower().split('.')[-1]
    
    # Copy to generated/ directory so the original is never touched
    gen_dir = os.path.join(project_root, "backend", "generated")
    os.makedirs(gen_dir, exist_ok=True)
    basename = os.path.splitext(os.path.basename(full_path))[0]
    copy_id = uuid.uuid4().hex[:6]
    copy_name = f"ref_{basename}_{copy_id}.{ext}"
    copy_path = os.path.join(gen_dir, copy_name)
    shutil.copy2(full_path, copy_path)
    
    if ext in ['step', 'stp']:
        return cq.importers.importStep(copy_path)
    elif ext == 'stl':
        import OCP.StlAPI as StlAPI
        import OCP.TopoDS as TopoDS
        from cadquery import Shape
        reader = StlAPI.StlAPI_Reader()
        shape = TopoDS.TopoDS_Shape()
        reader.Read(shape, copy_path)
        return cq.Workplane("XY").newObject([Shape(shape)])
    else:
        raise ValueError(f"Unsupported format: .{ext}. Please use STEP or STL.")

# ────────────────────────────────────────────────────────────────
# TEMPLATE REGISTRY
# ────────────────────────────────────────────────────────────────
TEMPLATE_REGISTRY: dict[str, dict] = {
    "swept_fin": {
        "function": create_swept_fin,
        "description": "Trapezoidal swept fin for rocket or aircraft stabilization",
        "parameters": [
            {"name": "root_chord",  "type": "float", "default": 180, "unit": "mm", "description": "Root chord length"},
            {"name": "tip_chord",   "type": "float", "default": 80,  "unit": "mm", "description": "Tip chord length"},
            {"name": "span",        "type": "float", "default": 250, "unit": "mm", "description": "Fin span (height)"},
            {"name": "thickness",   "type": "float", "default": 4,   "unit": "mm", "description": "Fin thickness"},
            {"name": "sweep_angle", "type": "float", "default": 30,  "unit": "deg","description": "Leading-edge sweep angle"},
        ],
    },
    "tube": {
        "function": create_tube,
        "description": "Hollow cylindrical tube / airframe section",
        "parameters": [
            {"name": "outer_diameter", "type": "float", "default": 50,  "unit": "mm", "description": "Outer diameter"},
            {"name": "inner_diameter", "type": "float", "default": 44,  "unit": "mm", "description": "Inner diameter"},
            {"name": "length",         "type": "float", "default": 200, "unit": "mm", "description": "Tube length"},
        ],
    },
    "nose_cone": {
        "function": create_nose_cone,
        "description": "Axisymmetric nose cone with selectable profile",
        "parameters": [
            {"name": "diameter", "type": "float",  "default": 60,     "unit": "mm", "description": "Base diameter"},
            {"name": "length",   "type": "float",  "default": 150,    "unit": "mm", "description": "Nose cone length"},
            {"name": "shape",    "type": "string", "default": "ogive", "unit": "",   "description": "Profile: ogive, conical, or parabolic"},
        ],
    },
    "mounting_bracket": {
        "function": create_mounting_bracket,
        "description": "L-shaped mounting bracket with bolt holes",
        "parameters": [
            {"name": "width",         "type": "float", "default": 60, "unit": "mm", "description": "Bracket width"},
            {"name": "height",        "type": "float", "default": 80, "unit": "mm", "description": "Overall height"},
            {"name": "thickness",     "type": "float", "default": 5,  "unit": "mm", "description": "Wall thickness"},
            {"name": "hole_count",    "type": "int",   "default": 4,  "unit": "",   "description": "Number of holes"},
            {"name": "hole_diameter", "type": "float", "default": 6,  "unit": "mm", "description": "Hole diameter"},
        ],
    },
    "bulkhead": {
        "function": create_bulkhead,
        "description": "Circular bulkhead disc with bolt-hole pattern",
        "parameters": [
            {"name": "diameter",             "type": "float", "default": 100, "unit": "mm", "description": "Outer diameter"},
            {"name": "thickness",            "type": "float", "default": 5,   "unit": "mm", "description": "Disc thickness"},
            {"name": "hole_count",           "type": "int",   "default": 8,   "unit": "",   "description": "Number of holes"},
            {"name": "hole_diameter",        "type": "float", "default": 8,   "unit": "mm", "description": "Hole diameter"},
            {"name": "hole_circle_diameter", "type": "float", "default": 70,  "unit": "mm", "description": "Bolt circle diameter"},
        ],
    },
    "rectangular_plate": {
        "function": create_rectangular_plate,
        "description": "Flat plate with rounded corners and corner holes",
        "parameters": [
            {"name": "length",        "type": "float", "default": 200, "unit": "mm", "description": "Plate length"},
            {"name": "width",         "type": "float", "default": 100, "unit": "mm", "description": "Plate width"},
            {"name": "thickness",     "type": "float", "default": 5,   "unit": "mm", "description": "Plate thickness"},
            {"name": "corner_radius", "type": "float", "default": 3,   "unit": "mm", "description": "Corner fillet radius"},
        ],
    },
    "cylinder": {
        "function": create_cylinder,
        "description": "Solid cylinder",
        "parameters": [
            {"name": "diameter", "type": "float", "default": 50,  "unit": "mm", "description": "Outer diameter"},
            {"name": "height",   "type": "float", "default": 100, "unit": "mm", "description": "Height"},
        ],
    },
    "cone": {
        "function": create_cone,
        "description": "Solid truncated or pointed cone",
        "parameters": [
            {"name": "bottom_diameter", "type": "float", "default": 50, "unit": "mm", "description": "Base diameter"},
            {"name": "top_diameter",    "type": "float", "default": 0,  "unit": "mm", "description": "Top diameter (0 for pointed)"},
            {"name": "height",          "type": "float", "default": 50, "unit": "mm", "description": "Height"},
        ],
    },
    "box": {
        "function": create_box,
        "description": "Solid rectangular box",
        "parameters": [
            {"name": "length", "type": "float", "default": 100, "unit": "mm", "description": "Length (X axis)"},
            {"name": "width",  "type": "float", "default": 50,  "unit": "mm", "description": "Width (Y axis)"},
            {"name": "height", "type": "float", "default": 20,  "unit": "mm", "description": "Height (Z axis)"},
        ],
    },
    "sphere": {
        "function": create_sphere,
        "description": "Solid sphere",
        "parameters": [
            {"name": "radius", "type": "float", "default": 25, "unit": "mm", "description": "Radius"},
        ],
    },
    "torus": {
        "function": create_torus,
        "description": "Solid torus (donut shape)",
        "parameters": [
            {"name": "major_radius", "type": "float", "default": 50, "unit": "mm", "description": "Distance from center to tube center"},
            {"name": "minor_radius", "type": "float", "default": 10, "unit": "mm", "description": "Radius of the tube"},
        ],
    },
    "wedge": {
        "function": create_wedge,
        "description": "Solid wedge shape",
        "parameters": [
            {"name": "dx", "type": "float", "default": 50, "unit": "mm", "description": "Length (X)"},
            {"name": "dy", "type": "float", "default": 50, "unit": "mm", "description": "Width (Y)"},
            {"name": "dz", "type": "float", "default": 50, "unit": "mm", "description": "Height (Z)"},
            {"name": "xmin", "type": "float", "default": 0, "unit": "mm", "description": "Bottom left X offset"},
            {"name": "zmin", "type": "float", "default": 0, "unit": "mm", "description": "Bottom left Z offset"},
            {"name": "xmax", "type": "float", "default": 0, "unit": "mm", "description": "Top left X offset"},
            {"name": "zmax", "type": "float", "default": 0, "unit": "mm", "description": "Top left Z offset"},
        ],
    },
    "import_reference": {
        "function": create_import_reference,
        "description": "Import a reference STEP or STL file from the References directory",
        "parameters": [
            {"name": "file_path", "type": "string", "default": "", "unit": "", "description": "Relative path to the STEP or STL file"},
        ],
    },
}
