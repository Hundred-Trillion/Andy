# 🚀 ANDY v1 — Aerospace Agentic CAD Copilot

ANDY is a state-of-the-art AI-powered aerospace engineering copilot. It acts as a **"Cursor for Aerospace CAD Engineering"**, combining professional manual CAD drafting with local AI-driven design synthesis.

> [!TIP]
> **🚀 Don't have a 96GB GPU cluster?** You can run ANDY entirely in the cloud with standard consumer hardware using OpenRouter or cloud API keys in under 2 minutes! See the [Cloud/Online Execution Guide (onlineguide.md)](onlineguide.md) to get started immediately.

---

## 🏎️ Features at a Glance

*   🗂️ **Multi-Session Tabs**: Manage multiple independent workspaces in parallel with Chrome-style tabs and pencil renaming.
*   ⚡ **Non-Flashing Component Rendering**: Per-mesh React Suspense boundaries with gray ghost wireframe placeholder loading. Already loaded geometry remains persistent.
*   🎨 **Manual Drafting Toolbar**: Glassmorphic floating drawer to instantly drop Box, Cylinder, Sphere, Tube, and Cone primitives.
*   🔄 **Automatic Collision Spacing**: Automatically offsets newly imported or manual shapes if the coordinate origin is occupied.
*   📐 **Ctrl + Mouse-Drag 3D Rotation**: Hold the `Ctrl` key and click-and-drag components to rotate them in 3D with 5-degree alignment snapping.
*   ↕️ **Quick Flip 3D**: Double-click any mesh to isolate it, open its card, and instantly flip it 180° around X, Y, or Z axes.

---

## 🛠️ Tech Stack
*   **Frontend**: React, TypeScript, Vite, React Three Fiber (3D WebGL viewport), Zustand.
*   **Backend**: Python 3.10+, FastAPI, CadQuery (Parametric OpenCASCADE modeling), LangChain + LangGraph.
*   **LLM Engine**: Local **Qwen2.5 72B GPTQ-Int4** via vLLM on dual A6000 GPUs (96GB total VRAM).

---

## 📦 Developer Setup & Installation Guide

Follow these steps to clone, configure, install, and run ANDY on your local development machine.

### 1. Clone the Repository
Clone the repository to your local computer:
```bash
git clone https://github.com/Hundred-Trillion/Andy.git
cd Andy
```

### 2. Environment Configuration
Copy the `.env.example` file to create your local `.env` configuration:
```bash
cp .env.example .env
```
Ensure your `.env` contains the correct host, port, and model definitions for your local environment.

### 3. Backend Setup (Conda / Virtualenv)
We recommend setting up a Python 3.10 environment.

**Using Conda:**
```bash
conda create -n vllm-env python=3.10
conda activate vllm-env
```

**Using Virtualenv:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Install requirements:**
```bash
pip install -r backend/requirements.txt
```

### 4. Frontend Setup (Node.js)
ANDY requires **Node.js v20.19+**. We recommend using `nvm` (Node Version Manager) to set your Node version.

```bash
cd frontend
# Ensure you are on Node 20.20.2
source ~/.nvm/nvm.sh  # (if nvm command is not loaded)
nvm install 20.20.2
nvm use 20.20.2

# Install dependencies
npm install
```

---

## 🚀 How to Run the Project (3 Terminals Required)

To run the full hybrid drafting stack, you must start the local LLM server (vLLM), the backend API, and the React frontend in three separate terminal windows.

### 📺 Terminal 1: vLLM (Local LLM Server)
Start the local LLM running Qwen2.5 72B on dual A6000 GPUs:
```bash
# Navigate to project root
conda activate vllm-env
./start_vllm.sh
```
*   **Wait for:** `Uvicorn running on http://0.0.0.0:8080` (Takes ~2 minutes to load the 72B model into VRAM).

---

### 📺 Terminal 2: Backend API (FastAPI + CAD Engine)
Start the FastAPI server handling CadQuery geometry compiling:
```bash
# Navigate to the backend directory
cd backend/
conda activate vllm-env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
> [!IMPORTANT]
> **Directory Context Warning**: You **MUST** run the `uvicorn` command from the `backend/` directory. Running it from the project root will result in `ModuleNotFoundError: No module named 'app'`.

*   **Wait for:** `Uvicorn running on http://0.0.0.0:8000`

---

### 📺 Terminal 3: Frontend (React + Vite)
Start the Vite development web server and launch the WebGL workspace:
```bash
# Navigate to the frontend directory
cd frontend/
source ~/.nvm/nvm.sh && nvm use 20.20.2
npm run dev
```
*   **Wait for:** `VITE ready in Xms → http://localhost:5173/`
*   Open [http://localhost:5173](http://localhost:5173) in your browser to start drafting!

---

## 🛠️ Common Troubleshooting & Issues

| Problem | Explanation / Fix |
|:---|:---|
| `ModuleNotFoundError: No module named 'app'` | You ran `uvicorn` from the wrong directory. Make sure you `cd backend/` first before starting the backend. |
| `Vite requires Node.js version 20.19+` | Your terminal is using an outdated Node version. Run `source ~/.nvm/nvm.sh && nvm use 20.20.2` before starting the frontend. |
| `address already in use (port 8000)` | The backend port is locked by a hanging process. Kill it using `kill $(lsof -t -i:8000) 2>/dev/null`. |
| `address already in use (port 8080)` | The vLLM port is locked. Kill it using `kill $(lsof -t -i:8080) 2>/dev/null`. |
| `nvm: command not found` | The Node Version Manager script is not loaded in your current shell. Load it using `source ~/.nvm/nvm.sh`. |

### Quick Cleanup Command
To immediately stop all hanging servers (vLLM, backend, and frontend) at once:
```bash
kill $(lsof -t -i:8080) 2>/dev/null  # Kill vLLM
kill $(lsof -t -i:8000) 2>/dev/null  # Kill Backend
kill $(lsof -t -i:5173) 2>/dev/null  # Kill Frontend
```

---

## 📄 License & Contribution

This repository is licensed under the **Business Source License 1.1 (BUSL-1.1)**.

*   **Allowed**: Non-commercial personal use, educational purposes, evaluation, and contributing pull requests or improvements to the repo.
*   **Restricted**: Any commercial production, direct hosting (SaaS), or commercial for-profit distribution is prohibited without an explicit commercial license from the Licensor (Hundred-Trillion).

On **May 25, 2030**, the repository automatically transitions to the **Apache License, Version 2.0**.
