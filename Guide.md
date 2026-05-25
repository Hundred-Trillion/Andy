# 🛠️ Andy — Interactive 3D Workspace Manual

Welcome to the Andy design workspace. This guide covers **every** way you can interact with the 3D viewport, from basic navigation to advanced multi-part assembly workflows. No CAD experience required.

---

## 🖱️ Mouse Controls — Quick Reference

| What you want to do | How to do it |
| :--- | :--- |
| **Orbit (rotate camera)** | Left-click on empty space + drag |
| **Pan (slide camera sideways)** | Hold **both** left + right mouse buttons and drag |
| **Zoom in/out** | Scroll wheel |
| **Select a part** | Single-click on the part |
| **Select multiple parts** | Hold `Shift` + click each part you want |
| **Open the Edit Card** | Hold left-click on a part for **3 seconds** (long press) |
| **Isolate a single part** | Triple-click the part (hides everything else) |
| **Un-isolate (show all)** | Triple-click the isolated part again, or click "Show All" in the toolbar |
| **Drag a part to a new position** | Left-click + drag the part across the grid |
| **Rotate a part freely** | Hold `Ctrl` + left-click drag on the part |

---

## 🧭 Camera Navigation

### Orbiting
Click on any **empty space** in the viewport and drag. The camera rotates around the center of the scene.

### Panning
Press **both mouse buttons at the same time** (left + right) and drag. The camera slides parallel to the ground plane. This is how you move your viewpoint without rotating.

### Zooming
Use the **scroll wheel** to zoom in and out. The camera zooms toward wherever your cursor is pointing.

---

## ✋ Selecting Parts

### Single Selection
**Click** on any 3D part. It gets highlighted with a yellow outline and a floating **Edit Card** appears showing its parameters, position, and action buttons.

### Multi-Selection (Shift+Click)
Hold **Shift** and click additional parts. Each one gets added to the selection. The toolbar will show **"Merge Selected (N)"** instead of "Merge All" when 2+ parts are selected. This lets you merge only the specific parts you want.

### Deselecting
Click on **empty space** to deselect everything.

---

## 📦 The Edit Card (Long Press)

When you **hold left-click on a part for 3 seconds**, a detailed editing card pops up attached to the part. This card gives you full parametric control:

### Parameters Section
Every part has dimension parameters (like `length`, `width`, `height`, `radius`, `diameter`, etc.) shown as editable text fields. Change any value and click **▶ Apply** to regenerate the part with new dimensions instantly.

### Position Section
Three fields for **Pos X**, **Pos Y**, **Pos Z** (in millimeters). Type exact coordinates to place the part precisely where you need it.

### Align / Rotate 90° Buttons
Quick-snap rotation buttons for precise alignment:

| Button | What it does |
| :--- | :--- |
| **⬅️ Left 90°** | Rotates 90° around the Y axis (turn left) |
| **➡️ Right 90°** | Rotates 90° around the Y axis (turn right) |
| **⬆️ Up 90°** | Tilts 90° around the X axis (tip backward) |
| **⬇️ Down 90°** | Tilts 90° around the X axis (tip forward) |
| **↕ Flip X** | Flips 180° around X axis (upside-down) |
| **↔ Flip Y** | Flips 180° around Y axis (mirror left-right) |
| **🔄 Flip Z** | Flips 180° around Z axis (spin flat) |

### Action Buttons
| Button | What it does |
| :--- | :--- |
| **▶ Apply** | Sends changed parameters/position to the backend and regenerates the part |
| **Copy** | Duplicates the part and places the copy at the next free grid position |
| **Del** | Deletes the part from the assembly |
| **✂️ Decompose** | Breaks a STEP file into individual sub-parts (only works with imported STEP files) |
| **👁️ Isolate / Show All** | Hides every other part so you can focus on this one. Click again to show all. |

---

## 🔄 Rotating Parts with Ctrl+Drag

Hold **Ctrl** and left-click drag on any part:

* **Drag horizontally** → rotates around the **Y axis** (yaw/turn) in 5° steps
* **Drag vertically** → rotates around the **X axis** (pitch/tilt) in 5° steps
* The rotation is **locked to one axis at a time** based on your initial drag direction, so you don't get chaotic flipping

This is the fastest way to align parts when building assemblies by hand.

---

## 🗂️ Workspace Tabs

Andy supports **multiple independent workspaces** as tabs, like browser tabs.

| Action | How |
| :--- | :--- |
| **Add a new tab** | Click the **+** button at the end of the tab bar |
| **Switch tabs** | Click any tab |
| **Rename a tab** | Double-click the tab name, or click the ✏️ pencil icon |
| **Close a tab** | Click the **×** on the tab (must keep at least 1 tab open) |

Each tab has its own independent set of parts, selection state, and model data.

---

## 🔨 Toolbar Buttons (Top-Right)

| Button | What it does |
| :--- | :--- |
| **Show All** | Un-isolates everything (only appears when a part is isolated) |
| **Merge All** / **Merge Selected (N)** | Combines parts into a single solid. If you Shift-selected 2+ parts, merges only those. |
| **↩️ Undo** | Reverts the last action (up to 50 steps) |
| **↪️ Redo** | Re-applies an undone action |
| **Wireframe** | Toggles wireframe rendering (see-through mesh lines) |
| **Box Mode** | Toggles amber bounding-box outlines showing the 3D space each part occupies |
| **Dimensions** | Toggles dimension display |
| **STEP** | Downloads the current model as a `.step` file (industry standard CAD format) |
| **STL** | Downloads the current model as a `.stl` file (3D printing format) |

---

## 🎨 Floating Shape Drawer (Left Side)

The vertical toolbar on the left edge of the viewport lets you instantly create primitive shapes:

| Icon | Shape | Default Size |
| :--- | :--- | :--- |
| ▪ Square | **Box** | 100 × 50 × 20 mm |
| ● Circle | **Cylinder** | Ø50 × 100 mm |
| ◉ Ring | **Sphere** | R25 mm |
| ○ Hollow | **Tube** | Ø50/44 × 200 mm |
| ▲ Triangle | **Cone** | Ø50 → 0 × 50 mm |
| 📂 Folder | **Reference Library** | Opens the reference file browser |

New shapes are automatically placed at the next free grid position so they don't overlap existing parts.

---

## 💬 AI Chat (Left Panel)

Type natural language instructions in the chat box (e.g. *"build a rocket with 4 fins"* or *"add a nose cone"*). The AI will generate a full parametric assembly and display it in the viewport. You can then manually adjust, rotate, merge, or delete any generated parts.

---

## 🔗 Exporting Your Work

### From the Toolbar
Click **STEP** or **STL** in the toolbar to download the entire assembly model file.

### From the Chat
When the AI generates a model, the chat message includes **STEP** and **STL** download buttons inline.

### What format to use?
* **STEP** — Industry standard. Use this if you're importing into SolidWorks, Fusion 360, FreeCAD, or any professional CAD software.
* **STL** — Mesh format. Use this for 3D printing (Cura, PrusaSlicer, etc.) or for quick visualization.

---

## 🧩 Common Workflows

### "I want to build a rocket from scratch"
1. Type *"build a rocket"* in the AI chat, or start placing shapes manually from the left drawer.
2. Use **Ctrl+Drag** to rotate fins into position.
3. Use the **Edit Card** (long-press) to adjust dimensions and snap positions.
4. Use **Merge Selected** to fuse parts together.
5. Click **STEP** to export.

### "I want to resize a part"
1. Click the part to select it.
2. Long-press (3 seconds) to open the Edit Card.
3. Change the parameter values (e.g. `length: 200`).
4. Click **▶ Apply**.

### "I want to flip a part upside-down"
1. Click the part to select it → the Edit Card opens.
2. In the **Align / Rotate 90°** section, click **↕ Flip X**.

### "I want to move a part to an exact location"
1. Select the part → Edit Card opens.
2. Change the **Pos X**, **Pos Y**, **Pos Z** fields to your desired coordinates.
3. Click **▶ Apply**.

### "I want to merge two specific parts"
1. Click the first part.
2. Hold **Shift** and click the second part.
3. Click **Merge Selected (2)** in the toolbar.

### "I want to see how much space a part takes up"
1. Toggle **Box Mode** in the toolbar.
2. Amber wireframe boxes appear around every part showing their bounding volume.

---

## ⚙️ For Developers

Source code for all viewport interactions:
* **Gesture handlers & 3D rendering**: `frontend/src/components/viewport/CadViewport.tsx`
* **State management**: `frontend/src/stores/viewportStore.ts`
* **CAD generation engine**: `backend/app/cad/generator.py`
* **Shape templates**: `backend/app/cad/templates.py`
* **API endpoints**: `backend/app/api/cad.py`
