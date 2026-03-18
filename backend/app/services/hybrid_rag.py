from __future__ import annotations
import os
import logging
from collections import defaultdict
from typing import Optional
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from sentence_transformers import CrossEncoder
from app.core.config import settings

logger = logging.getLogger(__name__)


class HybridRetriever:
    """
    Custom hybrid retriever combining BM25 (keyword) and ChromaDB (semantic)
    with configurable weights.
    """

    def __init__(self, bm25_retriever: BM25Retriever, chroma_retriever, reranker, k: int = 20, final_k: int = 6, weights=(0.5, 0.5)):
        self.bm25_retriever = bm25_retriever
        self.chroma_retriever = chroma_retriever
        self.reranker = reranker
        self.k = k
        self.final_k = final_k
        self.bm25_weight, self.chroma_weight = weights

    def invoke(self, query: str) -> list[Document]:
        bm25_docs: list[Document] = self.bm25_retriever.invoke(query) if self.bm25_retriever else []
        chroma_docs: list[Document] = self.chroma_retriever.invoke(query) if self.chroma_retriever else []

        scores: dict[str, float] = {}
        doc_map: dict[str, Document] = {}

        # BM25 scoring — Reciprocal Rank Fusion
        for rank, doc in enumerate(bm25_docs):
            key = doc.page_content
            scores[key] = scores.get(key, 0.0) + self.bm25_weight * (1.0 / (rank + 1))
            doc_map[key] = doc

        # Chroma semantic scoring — Reciprocal Rank Fusion
        for rank, doc in enumerate(chroma_docs):
            key = doc.page_content
            scores[key] = scores.get(key, 0.0) + self.chroma_weight * (1.0 / (rank + 1))
            doc_map[key] = doc

        # Sort by combined score descending, get top candidates
        top_keys: list[str] = sorted(scores, key=scores.__getitem__, reverse=True)  # type: ignore[type-var]
        candidate_docs = [doc_map[k] for k in top_keys[: self.k]]

        if not candidate_docs:
            return []

        # Rerank with CrossEncoder
        rerank_scores = self.reranker.predict([
            (query, doc.page_content) for doc in candidate_docs
        ])

        # Combines the documents with their CrossEncoder scores and sort descending
        reranked_docs = sorted(
            zip(candidate_docs, rerank_scores),
            key=lambda x: x[1],
            reverse=True
        )

        return [doc for doc, _score in reranked_docs[: self.final_k]]


class HybridRAG:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(
            model=settings.OLLAMA_EMBED_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
        )
        self.reranker = CrossEncoder("BAAI/bge-reranker-base")

        self.vector_store_dir = settings.CHROMA_PERSIST_DIR
        self.chroma_db: Optional[Chroma] = None
        self.bm25_retriever: Optional[BM25Retriever] = None
        self.all_documents: list[Document] = []

        self._initialize_stores()

    def _initialize_stores(self):
        """Initialize or load ChromaDB and rebuild BM25 if docs exist."""
        chroma_path = os.path.join(self.vector_store_dir, "chroma.sqlite3")

        if os.path.exists(chroma_path):
            self.chroma_db = Chroma(
                persist_directory=self.vector_store_dir,
                embedding_function=self.embeddings,
            )

            try:
                db: Chroma = self.chroma_db  # narrow Optional[Chroma] to Chroma
                count: int = db._collection.count()  # type: ignore[union-attr]

                if count > 0:
                    data = db.get()  # type: ignore[union-attr]

                    self.all_documents = [
                        Document(page_content=c, metadata=m)
                        for c, m in zip(data["documents"], data["metadatas"])
                    ]

                    self._rebuild_bm25()

                    logger.info(f"Restored {count} chunks from ChromaDB, BM25 rebuilt.")

            except Exception as e:
                logger.warning(f"Could not rebuild BM25 from ChromaDB: {e}")

    def _rebuild_bm25(self) -> None:
        """Rebuild BM25 retriever from all documents."""
        if self.all_documents:
            bm25 = BM25Retriever.from_documents(self.all_documents)
            bm25.k = 20
            self.bm25_retriever = bm25

    def add_documents(self, documents: list[Document]):
        """Add new documents to both ChromaDB and BM25."""
        if not documents:
            return

        if self.chroma_db is None:
            self.chroma_db = Chroma.from_documents(
                documents,
                self.embeddings,
                persist_directory=self.vector_store_dir,
            )
        else:
            existing_db: Chroma = self.chroma_db  # narrow Optional[Chroma]
            existing_db.add_documents(documents)  # type: ignore[union-attr]

        self.all_documents.extend(documents)
        self._rebuild_bm25()

        logger.info(f"Added {len(documents)} chunks. Total: {len(self.all_documents)}.")

    def delete_document(self, filename: str):
        """Remove a document and its chunks from both ChromaDB and BM25."""
        if not self.all_documents:
            return

        initial_count = len(self.all_documents)
        self.all_documents = [doc for doc in self.all_documents if doc.metadata.get("source") != filename]

        if len(self.all_documents) == initial_count:
            return

        self._rebuild_bm25()

        if self.chroma_db:
            try:
                db: Chroma = self.chroma_db  # type: ignore
                db._collection.delete(where={"source": filename})  # type: ignore
                logger.info(f"Deleted {filename} chunks from ChromaDB. Remaining total: {len(self.all_documents)}.")
            except Exception as e:
                logger.warning(f"Could not delete from ChromaDB: {e}")

    def get_ensemble_retriever(self):
        """Return hybrid retriever."""

        if not self.chroma_db:
            return None

        # Retrieve semantic candidates
        chroma_retriever = self.chroma_db.as_retriever(search_kwargs={"k": 20})

        return HybridRetriever(
            bm25_retriever=self.bm25_retriever,
            chroma_retriever=chroma_retriever,
            reranker=self.reranker,
            k=20,  # Ensure we capture top candidates for reranking
            final_k=6, # Top 6 chunks to return to the LLM
            weights=(0.5, 0.5),
        )

    def similarity_search_with_score(self, query: str, k: int = 8):
        """Return docs + similarity scores for confidence calculation."""

        if not self.chroma_db:
            return []

        try:
            return self.chroma_db.similarity_search_with_relevance_scores(query, k=k)

        except Exception as e:
            logger.warning(f"Similarity search failed: {e}")
            return []


hybrid_rag_service = HybridRAG()