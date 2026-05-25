"""ANDY v1 — FastAPI application entry point."""

from __future__ import annotations
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.chat import router as chat_router
from app.api.cad import router as cad_router
from app.api.references import router as ref_router
from app.api.decompose import router as decompose_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("andy")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    logger.info("ANDY v1 starting up...")
    logger.info(f"LLM: {settings.LLM_MODEL_NAME}")
    logger.info(f"Qdrant: {settings.QDRANT_HOST}:{settings.QDRANT_PORT}")
    logger.info(f"Generated dir: {settings.GENERATED_DIR}")

    # Ensure dirs exist
    Path(settings.GENERATED_DIR).mkdir(parents=True, exist_ok=True)

    yield

    logger.info("ANDY v1 shutting down.")


app = FastAPI(
    title="ANDY — Aerospace Engineering Copilot",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (generated models) ───────────────────────────
gen_dir = Path(settings.GENERATED_DIR)
gen_dir.mkdir(parents=True, exist_ok=True)
app.mount("/generated", StaticFiles(directory=str(gen_dir)), name="generated")

# ── API routes ─────────────────────────────────────────────────
app.include_router(chat_router, prefix="/api")
app.include_router(cad_router, prefix="/api")
app.include_router(ref_router, prefix="/api")
app.include_router(decompose_router, prefix="/api")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "model": settings.LLM_MODEL_NAME,
    }
