# 🛠️ Andy Interactive CAD Operational Manual

Welcome to **Andy**, the next-generation intelligent parametric CAD modeling platform. This guide provides a complete reference for using the interactive 3D viewport, keyboard/mouse shortcuts, and advanced editing features.

---

## 🎮 3D Viewport Gestures & Shortcuts

Mastering viewport controls allows you to arrange, align, and manipulate 3D shapes with maximum speed and precision.

| Action | Control Gesture | Purpose / Effect |
| :--- | :--- | :--- |
| **Select / Focus** | `Single-Click` | Highlights the component in the workspace. |
| **Open Properties** | `Long-Press (Hold 3s)` | predictable parametric popup card showing dimensions, location, and align controls. |
| **Isolate / Focus** | `Triple-Click` | Hides all other parts, highlighting only this model. Triple-click again to reveal all. |
| **Orbit Camera** | `Left-Click + Drag` | Rotates the scene camera in 3D space. |
| **Pan / Hover** | `Left + Right Click simultaneous` | Moves/pans the camera viewpoint smoothly across the ground grid. |
| **Align / Rotate** | `Ctrl + Left-Click Drag` | Pivots shape on locked dominant axis (yaw for horizontal drag, pitch for vertical). |

---

## 📐 Aligning & Positioning Shapes

### Locked Single-Axis Rotation
To solve chaotic rotational flipping in 3D, Andy locks drag rotation to a single active axis depending on your initial drag direction:
* **Horizontal drag (left-to-right)**: Exclusively rotates **Yaw (Y Axis)** in 5-degree increments.
* **Vertical drag (up-to-down)**: Exclusively rotates **Pitch (X Axis)** in 5-degree increments.
* This locks orientation during manual alignment, giving you precise, stable control.

---

## 🎨 Tactile UI Controls

### 1. Undo & Redo History
Located in the top-right control toolbar, the **Undo (↩️)** and **Redo (↪️)** buttons maintain a comprehensive 50-step session history stack. Any primitive addition, duplication, drag movement, parameter change, or deletion can be instantly rolled back or forward.

### 2. Direct 90-Degree Rotations
Inside the parametric edit popup card (opened via **3s Long-Press**), you will find direct alignment buttons:
* **⬅️ Left 90° / ➡️ Right 90°**: Rotates the component on the Y-Axis.
* **⬆️ Up 90° / ⬇️ Down 90°**: Rotates the component on the X-Axis.
* **↕ Flip X / ↔ Flip Y / 🔄 Flip Z**: Performs standard 180-degree flips on the respective axis.

### 3. Workspace Tab Customization
Rename workspace tabs at any time by:
1. Double-clicking the active tab name.
2. Clicking the hoverable **Pencil** icon next to the tab label.

### 4. Parametric Control Form
Input precise dimension values (length, width, height, radius, counts) or position offsets (X, Y, Z in mm) directly into the popup card, then click **▶ Apply** to trigger instant CAD re-generation via the CSG backend.

---

## 🚀 Developers Integration
For custom keybindings or gesture handlers, codebases are cleanly organized inside:
* Viewport gesture hooks: `frontend/src/components/viewport/CadViewport.tsx`
* History & state actions: `frontend/src/stores/viewportStore.ts`
