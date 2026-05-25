# ANDY v1 — Quick Run Guide

> **3 terminals required.** Open them all from the project root:
> `cd ~/Desktop/andy\ v0`

---

## Terminal 1 — vLLM (Local LLM Server)

```bash
# From: ~/Desktop/andy v0
conda activate vllm-env
./start_vllm.sh
```

**Wait for:** `Uvicorn running on http://0.0.0.0:8080`
This runs the Qwen 72B GPTQ model on your 2× A6000 GPUs. Takes ~2-3 minutes to load.

| Setting | Value |
|---------|-------|
| Port | `8080` |
| Model | `qwen72b` (at `/home/doaid/vllm_env/LLMMODELS/queen`) |
| GPUs | 2× A6000 (96GB total) |
| Context | 16K tokens |

---

## Terminal 2 — Backend (FastAPI + CAD Engine)

```bash
# From: ~/Desktop/andy v0/backend
cd ~/Desktop/andy\ v0/backend
conda activate vllm-env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Wait for:** `Uvicorn running on http://0.0.0.0:8000`

> ⚠️ **MUST** run from `backend/` directory. Running from project root gives `ModuleNotFoundError: No module named 'app'`

| Setting | Value |
|---------|-------|
| Port | `8000` |
| Env | `vllm-env` (needs cadquery, fastapi, langchain, etc.) |
| Config | Reads `../.env` for LLM connection |

---

## Terminal 3 — Frontend (React + Vite)

```bash
# From: ~/Desktop/andy v0/frontend
cd ~/Desktop/andy\ v0/frontend
source ~/.nvm/nvm.sh
nvm use 20.20.2
npm run dev
```

**Wait for:** `VITE ready in Xms → http://localhost:5173/`

> ⚠️ **Requires Node.js 20.19+.** If you get `Vite requires Node.js version 20.19+`, run `nvm use 20.20.2` first.

| Setting | Value |
|---------|-------|
| Port | `5173` |
| Node | `v20.20.2` (via nvm) |
| API proxy | Connects to backend at `localhost:8000` |

---

## Open in Browser

```
http://localhost:5173
```

---

## Startup Order

```
1. vLLM (Terminal 1)  ← must be ready before backend sends LLM requests
2. Backend (Terminal 2) ← must be ready before frontend makes API calls  
3. Frontend (Terminal 3) ← open browser after this is ready
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: No module named 'app'` | You ran uvicorn from wrong dir. `cd backend/` first |
| `Vite requires Node.js version 20.19+` | Run `source ~/.nvm/nvm.sh && nvm use 20.20.2` |
| `address already in use (port 8000)` | Kill old process: `kill $(lsof -t -i:8000)` |
| `address already in use (port 8080)` | Kill old vLLM: `kill $(lsof -t -i:8080)` |
| `nvm: command not found` | Run `source ~/.nvm/nvm.sh` first |
| Backend can't connect to LLM | Make sure Terminal 1 (vLLM) is fully loaded |
| Frontend shows "Backend not running" | Make sure Terminal 2 (Backend) is running |

---

## Quick Kill & Restart

```bash
# Kill everything
kill $(lsof -t -i:8080) 2>/dev/null  # vLLM
kill $(lsof -t -i:8000) 2>/dev/null  # Backend
kill $(lsof -t -i:5173) 2>/dev/null  # Frontend
```

---

## Project Structure

```
~/Desktop/andy v0/
├── start_vllm.sh          ← Terminal 1: run this
├── .env                   ← config (LLM URL, ports)
├── References/            ← CAD reference models (STEP/STL)
├── backend/               ← Terminal 2: cd here, then uvicorn
│   ├── app/
│   │   ├── main.py        ← FastAPI entry point
│   │   ├── agents/        ← LangGraph AI pipeline
│   │   ├── api/           ← REST endpoints
│   │   ├── cad/           ← CadQuery templates & generator
│   │   └── core/          ← config & models
│   ├── generated/         ← exported STL/STEP files
│   └── requirements.txt
└── frontend/              ← Terminal 3: cd here, then npm run dev
    ├── src/
    │   ├── App.tsx
    │   ├── components/    ← UI components
    │   ├── stores/        ← Zustand state
    │   └── lib/           ← API client & types
    └── package.json
```
