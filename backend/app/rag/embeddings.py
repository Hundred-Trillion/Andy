"""ANDY v1 — Local embedding model for RAG (optional)."""

from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

_model = None
_available = None


def _is_available() -> bool:
    global _available
    if _available is None:
        try:
            import sentence_transformers  # noqa: F401
            _available = True
        except ImportError:
            logger.info("sentence-transformers not installed — embeddings disabled")
            _available = False
    return _available


def _get_model():
    global _model
    if not _is_available():
        return None
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading embedding model all-MiniLM-L6-v2 ...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_text(text: str) -> list[float]:
    model = _get_model()
    if model is None:
        return []
    return model.encode(text).tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = _get_model()
    if model is None:
        return [[] for _ in texts]
    return model.encode(texts).tolist()
