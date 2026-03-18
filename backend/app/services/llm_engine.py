import logging
import re
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage
from app.core.config import settings
from app.services.hybrid_rag import hybrid_rag_service

logger = logging.getLogger(__name__)


class LLMEngine:
    def __init__(self):
        self.llm = ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=0,
            num_ctx=2048,
            num_predict=256
        )

        self.hybrid_rag = hybrid_rag_service

    def _count_problem_statements(self):
        pattern = re.compile(r"^\d+\.")
        count = 0

        for doc in self.hybrid_rag.all_documents:
            for line in doc.page_content.split("\n"):
                if pattern.match(line.strip()):
                    count += 1

        return count

    def is_global_question(self, question: str) -> bool:
        keywords = ["how many", "count", "list all", "summarize", "overview", "all sections", "total"]
        return any(k in question.lower() for k in keywords)

    def answer_question(self, question: str):

        if not self.hybrid_rag.all_documents:
            return {
                "answer": "No documents uploaded.",
                "confidence": 0,
                "sources": [],
                "chunk_preview": ""
            }

        q = question.lower()

        if "how many" in q and "problem" in q:
            total = self._count_problem_statements()

            return {
                "answer": str(total),
                "confidence": 100,
                "sources": [],
                "chunk_preview": "Counted from numbered sections in the document."
            }

        if self.is_global_question(question):
            docs = self.hybrid_rag.all_documents
            context = "\n\n".join([doc.page_content for doc in docs])
            confidence = 100.0
            sources = [{"file": docs[0].metadata.get("file_name", "unknown"), "page": "All"}] if docs else []
            chunk_preview = "Bypassed standard retrieval: full document context provided to LLM."
        else:
            retriever = self.hybrid_rag.get_ensemble_retriever()
            if retriever:
                docs = retriever.invoke(question)
                context = "\n\n".join([doc.page_content for doc in docs])
            else:
                docs = []
                context = ""

            scored = self.hybrid_rag.similarity_search_with_score(question, k=5)

            if scored:
                raw_scores: list[float] = [float(score) for _, score in scored]
                confidence = float(round(float(sum(raw_scores) / len(raw_scores)) * 100.0, 2))
            else:
                confidence = 0.0

            sources = []
            chunk_preview = ""

            if docs:
                for doc in docs[:3]:
                    sources.append({
                        "file": doc.metadata.get("file_name", "unknown"),
                        "page": doc.metadata.get("page_number", "?")
                    })
                chunk_preview = docs[0].page_content[:300]

        prompt = f"""
You are an intelligent assistant. Use ONLY the provided document context to answer the question.
If the user asks about a specific numbered item (e.g., "10 problem statement"), look for similarly numbered headers or sections (like "10. Problem Statement") in the context.
Synthesize the answer clearly and concisely (2-4 sentences max).

Context:
{context}

Question:
{question}
"""

        response = self.llm.invoke([HumanMessage(content=prompt)])
        answer = response.content

        return {
            "answer": answer,
            "confidence": confidence,
            "sources": sources,
            "chunk_preview": chunk_preview
        }


llm_engine = LLMEngine()