import os
import io
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from app.core.config import settings
from app.models.schemas import (
    QuestionRequest,
    AnswerResponse,
    UploadResponse,
    DocumentStatus,
    ExportRequest,
)
from app.services.ingestion import ingest_pdf
from app.services.hybrid_rag import hybrid_rag_service
from app.services.llm_engine import llm_engine
import shutil
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload", response_model=List[UploadResponse])
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload one or more PDF files and index them."""
    results = []
    for file in files:
        if not file.filename.endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"Only PDF files are supported. '{file.filename}' is not a PDF.",
            )

        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)

        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            chunks = ingest_pdf(file_path, file.filename)
            hybrid_rag_service.add_documents(chunks)

            results.append(
                UploadResponse(
                    filename=file.filename,
                    message="File successfully uploaded and indexed.",
                    num_chunks=len(chunks),
                )
            )
        except Exception as e:
            logger.error(f"Error uploading {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    return results


@router.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """Ask a question against the indexed documents."""
    retriever = hybrid_rag_service.get_ensemble_retriever()

    if not retriever:
        raise HTTPException(
            status_code=400, detail="No documents have been indexed yet."
        )

    try:
        result = llm_engine.answer_question(request.question)
        return AnswerResponse(**result)
    except Exception as e:
        logger.error(f"Error answering question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents", response_model=List[DocumentStatus])
def list_documents():
    """Returns a list of uploaded documents."""
    docs = []
    if os.path.exists(settings.UPLOAD_DIR):
        for filename in os.listdir(settings.UPLOAD_DIR):
            if filename.endswith(".pdf"):
                docs.append(DocumentStatus(filename=filename, indexed=True))
    return docs


@router.delete("/documents/{filename}")
async def delete_document(filename: str):
    """Delete an uploaded document and remove it from the index."""
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            logger.error(f"Error deleting file {filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Could not delete file: {str(e)}")
    
    try:
        hybrid_rag_service.delete_document(filename)
    except Exception as e:
        logger.error(f"Error removing {filename} from index: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": f"Successfully deleted {filename}"}


@router.post("/export")
async def export_chat_pdf(request: ExportRequest):
    """Generate a downloadable PDF report with question, answer, confidence, and sources."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=40, bottomMargin=40)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=20,
        textColor=HexColor("#7c3aed"),
        spaceAfter=20,
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=HexColor("#6d28d9"),
        spaceBefore=16,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "CustomBody",
        parent=styles["BodyText"],
        fontSize=11,
        leading=16,
        spaceAfter=10,
    )
    meta_style = ParagraphStyle(
        "Meta",
        parent=styles["BodyText"],
        fontSize=9,
        textColor=HexColor("#6b7280"),
        spaceAfter=4,
    )

    elements = []

    # Title
    elements.append(Paragraph("DocuMind-AI — Analysis Report", title_style))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(f"Generated: {request.timestamp}", meta_style))
    elements.append(Spacer(1, 16))

    # Question
    elements.append(Paragraph("Question", heading_style))
    elements.append(Paragraph(request.question, body_style))

    # Answer
    elements.append(Paragraph("Answer", heading_style))
    elements.append(Paragraph(request.answer, body_style))

    # Confidence
    elements.append(Paragraph("Confidence Score", heading_style))
    elements.append(Paragraph(f"{request.confidence:.1f}%", body_style))

    # Sources table
    if request.sources:
        elements.append(Paragraph("Sources", heading_style))
        table_data = [["#", "File", "Page"]]
        for i, src in enumerate(request.sources, 1):
            table_data.append([str(i), src.file, str(src.page)])

        table = Table(table_data, colWidths=[0.5 * inch, 4 * inch, 1 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#7c3aed")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("TOPPADDING", (0, 0), (-1, 0), 8),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#d1d5db")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#f9fafb"), HexColor("#ffffff")]),
                ]
            )
        )
        elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="DocuMind_Report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
        },
    )
