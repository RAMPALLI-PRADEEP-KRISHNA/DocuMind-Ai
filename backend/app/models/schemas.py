from pydantic import BaseModel
from typing import List, Optional


class QuestionRequest(BaseModel):
    question: str


class SourceInfo(BaseModel):
    file: str
    page: int


class AnswerResponse(BaseModel):
    answer: str
    confidence: float
    sources: List[SourceInfo]
    chunk_preview: str


class ExportRequest(BaseModel):
    question: str
    answer: str
    confidence: float
    sources: List[SourceInfo]
    timestamp: str


class UploadResponse(BaseModel):
    filename: str
    message: str
    num_chunks: int


class DocumentStatus(BaseModel):
    filename: str
    indexed: bool
