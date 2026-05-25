"""ANDY v1 — RAG retriever (optional — requires Qdrant + sentence-transformers)."""

from __future__ import annotations
import logging
from app.core.models import ReferenceDoc

logger = logging.getLogger(__name__)


def retrieve(query: str, top_k: int = 5) -> list[ReferenceDoc]:
    """Search for relevant aerospace docs. Returns empty list if Qdrant unavailable."""
    try:
        from qdrant_client import QdrantClient
        from app.core.config import settings
        from app.rag.embeddings import embed_text

        vec = embed_text(query)
        if not vec:
            return []

        client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT, timeout=2)
        collections = [c.name for c in client.get_collections().collections]
        if settings.QDRANT_COLLECTION not in collections:
            return []

        results = client.search(
            collection_name=settings.QDRANT_COLLECTION,
            query_vector=vec,
            limit=top_k,
        )

        return [
            ReferenceDoc(
                title=(hit.payload or {}).get("title", ""),
                source=(hit.payload or {}).get("source", ""),
                snippet=(hit.payload or {}).get("text", "")[:300],
                score=round(hit.score, 3),
            )
            for hit in results
        ]
    except Exception as e:
        logger.debug(f"RAG unavailable: {e}")
        return []
