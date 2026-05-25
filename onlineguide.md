# 🌐 ANDY v1 — Cloud/Online Execution Guide

This guide explains how to run **ANDY** on standard consumer computers (laptops/desktops) without needing massive local GPU hardware (such as dual A6000s). You can run ANDY entirely online using a cloud API provider (like **OpenRouter** or standard **OpenAI** endpoints).

---

## ⚡ Quick Setup — Running via Cloud API Keys

In online cloud mode, the React frontend and FastAPI backend run on your local computer, but all engineering intelligence is handled via API calls to a powerful hosted model (like `Nvidia Nemotron 70B` or `Qwen2.5 72B`).

### 1. Configure your `.env` File

Open the `.env` file in the project root and edit the **ONLINE MODE** section:

```env
# ==========================================
# ONLINE MODE (OpenRouter / Nvidia Nemotron)
# ==========================================
OPENROUTER_API_KEY=your_real_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL_NAME=nvidia/nemotron-3-super-120b-a12b:free  # Or any other model of your choice
```

> [!NOTE]
> Make sure to comment out or delete the local/offline vLLM configuration values in `.env` to prevent the backend from trying to connect to a local port:
> ```env
> # OPENROUTER_API_KEY=empty
> # OPENROUTER_BASE_URL=http://localhost:8080/v1
> ```

---

## 🚀 How to Launch (Only 2 Terminals Required!)

Since the LLM is hosted in the cloud, you **do not need** to start the vLLM server locally. You only need to run the backend engine and the React frontend!

### 📺 Terminal 1: Backend API (FastAPI + CAD Engine)
Run the geometry processing server locally:
```bash
# Navigate to the backend directory
cd backend/

# Activate your python virtual environment
source venv/bin/activate  # Or conda activate vllm-env

# Launch uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
*   **Wait for:** `Uvicorn running on http://0.0.0.0:8000`

---

### 📺 Terminal 2: Frontend (React + Vite)
Launch the 3D viewport in your web browser:
```bash
# Navigate to the frontend directory
cd frontend/

# Ensure you are on Node 20.20.2+
nvm use 20.20.2

# Start development server
npm run dev
```
*   **Wait for:** `VITE ready in Xms → http://localhost:5173/`
*   Open [http://localhost:5173](http://localhost:5173) in your browser and start designing!

---

## 💡 Recommended Cloud Models

You can configure any OpenRouter model in `LLM_MODEL_NAME`. Here are the recommended models optimized for spatial structure and CAD JSON generation:

| Model ID | Provider | Cost | Notes |
|:---|:---|:---|:---|
| `nvidia/nemotron-3-super-120b-a12b:free` | OpenRouter (Nvidia) | **Free** | Excellent spatial planning and structure reasoning. |
| `qwen/qwen-2.5-72b-instruct` | OpenRouter (Alibaba) | Low | Flawless JSON generation and extremely fast processing. |
| `meta-llama/llama-3.1-70b-instruct` | OpenRouter (Meta) | Low | Very stable engineering reasoning. |
