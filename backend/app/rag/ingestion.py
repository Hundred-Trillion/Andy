"""ANDY v1 — Document ingestion (optional — requires qdrant-client + sentence-transformers)."""

from __future__ import annotations
import logging

logger = logging.getLogger(__name__)


def ensure_collection():
    """Create Qdrant collection if it doesn't exist."""
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams
        from app.core.config import settings

        client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT, timeout=2)
        collections = [c.name for c in client.get_collections().collections]
        if settings.QDRANT_COLLECTION not in collections:
            client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            logger.info(f"Created collection '{settings.QDRANT_COLLECTION}'")
    except Exception as e:
        logger.debug(f"Qdrant not available: {e}")


def ingest_documents(docs_dir: str | None = None) -> int:
    """Load markdown files, chunk, embed, and upsert to Qdrant. Returns 0 if deps missing."""
    try:
        from pathlib import Path
        from qdrant_client import QdrantClient
        from qdrant_client.models import PointStruct
        from app.core.config import settings
        from app.rag.embeddings import embed_texts

        docs_path = Path(docs_dir or settings.DATA_DIR)
        if not docs_path.exists():
            return 0

        ensure_collection()

        all_chunks: list[dict] = []
        for md_file in sorted(docs_path.glob("*.md")):
            text = md_file.read_text(encoding="utf-8")
            title = md_file.stem.replace("_", " ").title()
            chunks = _chunk_text(text)
            for i, chunk in enumerate(chunks):
                all_chunks.append({"text": chunk, "title": title, "source": md_file.name, "chunk_index": i})

        if not all_chunks:
            return 0

        texts = [c["text"] for c in all_chunks]
        vectors = embed_texts(texts)
        if not vectors or not vectors[0]:
            logger.info("Embeddings unavailable — skipping ingestion")
            return 0

        points = [
            PointStruct(id=idx, vector=vec, payload=chunk)
            for idx, (chunk, vec) in enumerate(zip(all_chunks, vectors))
        ]

        client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
        client.upsert(collection_name=settings.QDRANT_COLLECTION, points=points)
        logger.info(f"Ingested {len(points)} chunks")
        return len(points)

    except Exception as e:
        logger.debug(f"Ingestion unavailable: {e}")
        return 0


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 200) -> list[str]:
    paragraphs = text.split("\n\n")
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) > chunk_size and current:
            chunks.append(current.strip())
            words = current.split()
            overlap_words = words[-overlap // 5:] if len(words) > overlap // 5 else words
            current = " ".join(overlap_words) + "\n\n" + para
        else:
            current = current + "\n\n" + para if current else para
    if current.strip():
        chunks.append(current.strip())
    return chunks
