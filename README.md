# 🚀 ANDY v1 — Aerospace Agentic CAD Copilot

ANDY is an AI-powered aerospace engineering copilot web application. It acts as a **"Cursor for Aerospace CAD Engineering"**, combining professional manual CAD drafting with state-of-the-art AI-driven design synthesis.

---

## 🏎️ Hybrid Co-working Workbench Features (v2)

### 🗂️ 1. Chrome-Style Multi-Session Tabs
Manage multiple independent CAD workspaces in parallel just like in a browser:
*   ➕ **Create Session**: Click the `+` icon to spin up a fresh, clean CAD canvas instantly.
*   🏷️ **Inline Tab Renaming**: Double-click any session tab to rename it on the fly (e.g. *Fin Assembly*, *Engine Mount*, *Bulkhead*).
*   💾 **Persistent State**: Switching tabs instantly swaps loaded shapes, active selections, and parameters without resetting your other parallel sessions.

### ⚡ 2. Non-Flashing Independent Component Loading
*   **Per-Component Suspense Boundaries**: Each solid part in the viewport is wrapped in its own isolated React Suspense lifecycle.
*   **Ghost Fallbacks**: When adding a new primitive or importing a heavy STEP reference, only the new object renders a subtle grey ghost wireframe placeholder while compiling. The rest of the scene remains fully interactive.
*   **Zero Viewport Distraction**: Already-loaded solids stay perfectly visible, static, and persistent on the canvas. No white screens, no lag, and no sudden refreshes!

### 🎨 3. Real-Time Floating Manual Drafting Toolbar
Located floating directly on the warm, sketch-paper engineering canvas, a **graphic vertical drafting toolbar** allows you to instantly drop components without writing a single line of text or prompt:
*   🟩 **Box Primitive**: Instantly drops a $100 \times 50 \times 20\text{ mm}$ box.
*   🧪 **Cylinder Primitive**: Instantly drops a $\varnothing 50 \times 100\text{ mm}$ cylinder.
*   🔮 **Sphere Primitive**: Instantly drops a $\varnothing 50\text{ mm}$ sphere.
*   🚇 **Tube Primitive**: Instantly drops a $\varnothing 50 \times \varnothing 44 \times 200\text{ mm}$ tube.
*   📐 **Cone Primitive**: Instantly drops a $\varnothing 50 \text{ bottom} \times 0 \text{ top} \times 50\text{ mm}$ cone.
*   📂 **Reference Library**: Quick access to import step, stl, or reference files directly.

> [!NOTE]
> **Intelligent Collision Avoidance**: If the origin or main axis is occupied by a part, the viewport automatically uses a spiral algorithm to place the new part offset from existing parts so they never overlap.

### 🔄 4. Real-Time Viewport Sync & Persistent Drag Rebuilding
*   **Reactive Properties**: Selecting components in the 3D canvas immediately highlights them in the right-side **Assembly** parameter list.
*   **Automatic 3D Rebuilds**: Modifying values (e.g., changing Length) in the sidebar instantly updates locally as you type, and auto-compiles the solid geometry in 3D the moment you hit `Enter` or click/tab away (`onBlur`).
*   **Drag-to-Move Persistence**: Dragging components on the XZ plane automatically commits the new position, regenerates the underlying STEP/STL CAD models on the backend, and saves the new assembly structure.

### 📐 5. Ctrl + Mouse-Drag 3D Rotation
*   **Hold Ctrl + Mouse-Drag**: Left-click and drag any 3D model while holding the `Ctrl` key to rotate it in 3D space!
*   **Snap-to-Angle**: Smoothly snaps orientation to the nearest 5 degrees for a professional CAD alignment feel.
*   **Interactive 3D Rebuild**: Releasing the mouse instantly compiles and saves the new 3D angles.

### ↕️ 6. Quick Flip 3D
*   Click a component to reveal the details popup.
*   Under the **Quick Flip 3D** panel, click **↕ Flip X**, **↔ Flip Y**, or **🔄 Flip Z** to instantly rotate the model 180 degrees around that axis, with automatic real-time geometry reconstruction.

---

## 🛠️ Tech Stack
*   **Frontend**: React, TypeScript, Vite, React Three Fiber (3D rendering), Zustand.
*   **Backend**: Python, FastAPI, CadQuery (Parametric Modeling), LangChain + LangGraph.
*   **LLM Engine**: Local **Qwen2.5 72B GPTQ-Int4** running via vLLM on dual NVIDIA RTX A6000 GPUs (96GB VRAM total) for high-context, ultra-fast local reasoning.

---

## 🚀 How to Run the Project

### 1. Start the Local LLM Server (vLLM)
Navigate to the root directory and start the vLLM server:
```bash
./start_vllm.sh
```

### 2. Start the Backend API
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to: [http://localhost:5173](http://localhost:5173)

---

## 📄 License & Contribution

This repository is licensed under the **Business Source License 1.1 (BUSL-1.1)**.

### Allowed:
*   Non-commercial personal use and contribution.
*   Educational, academic, and evaluation use.
*   Copying and modifying for these purposes.

### Restricted:
*   Commercial production, cloud hosting, SaaS, or direct for-profit services are prohibited without an explicit commercial license from the Licensor.

On **May 25, 2030**, this work automatically transitions to the **Apache License, Version 2.0**.
