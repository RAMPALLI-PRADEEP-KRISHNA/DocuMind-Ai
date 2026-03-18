import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import logging

logger = logging.getLogger(__name__)


def ingest_pdf(file_path: str, filename: str) -> list[Document]:
    """Loads a PDF using PyMuPDF, splits it into chunks, and returns LangChain Documents."""
    try:
        doc = fitz.open(file_path)
        documents = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text.strip():
                documents.append(
                    Document(
                        page_content=text,
                        metadata={
                            "file_name": filename,
                            "page_number": page_num + 1,  # 1-indexed
                            "source": filename,
                        },
                    )
                )

        doc.close()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=300,
            chunk_overlap=50,
        )
        chunks = text_splitter.split_documents(documents)

        logger.info(f"Ingested {filename}: {len(chunks)} chunks created from {len(documents)} pages.")
        return chunks
    except Exception as e:
        logger.error(f"Error ingesting {filename}: {str(e)}")
        raise e
