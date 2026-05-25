"""ANDY v1 — References API routes."""

from __future__ import annotations
import asyncio
import logging
import os
import glob
from fastapi import APIRouter
from app.core.models import SearchRequest, ReferenceDoc
from app.rag.retriever import retrieve
from app.rag.ingestion import ingest_documents

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/references/search")
async def search_refs(request: SearchRequest):
    """Search aerospace references by query."""
    docs = await asyncio.to_thread(retrieve, request.query, request.top_k)
    return docs


@router.post("/references/ingest")
async def ingest():
    """Trigger document ingestion from data directory."""
    count = await asyncio.to_thread(ingest_documents)
    return {"status": "ok", "chunks_ingested": count}


@router.get("/references")
async def list_refs():
    """List all reference documents."""
    # Simple search with broad query to get all
    docs = await asyncio.to_thread(retrieve, "aerospace engineering", 20)
    return docs


@router.get("/references/files")
async def list_reference_files():
    """List all CAD reference files (STEP/STL) available in the References folder."""
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    ref_dir = os.path.join(project_root, "References")
    
    if not os.path.exists(ref_dir):
        return []
    
    files = []
    extensions = ('*.step', '*.stp', '*.STEP', '*.STP', '*.stl', '*.STL')
    
    for ext in extensions:
        for filepath in glob.glob(os.path.join(ref_dir, '**', ext), recursive=True):
            rel_path = os.path.relpath(filepath, project_root).replace('\\', '/')
            name = os.path.basename(filepath)
            # Get a clean display name from the parent directory or filename
            parent = os.path.basename(os.path.dirname(filepath))
            display_name = parent if parent != "References" else os.path.splitext(name)[0]
            display_name = display_name.replace('-', ' ').replace('_', ' ').replace('.snapshot.', ' v')
            
            size_bytes = os.path.getsize(filepath)
            size_mb = round(size_bytes / (1024 * 1024), 1)
            file_ext = os.path.splitext(name)[1].lower().lstrip('.')
            
            files.append({
                "name": display_name,
                "path": rel_path,
                "format": file_ext,
                "size_mb": size_mb,
            })
    
    # Sort by name
    files.sort(key=lambda f: f["name"].lower())
    
    # Deduplicate by path
    seen = set()
    unique = []
    for f in files:
        if f["path"] not in seen:
            seen.add(f["path"])
            unique.append(f)
    
    return unique

