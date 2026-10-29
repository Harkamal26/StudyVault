# uvicorn api:app --reload --port 8000
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from rag_chat import generate_answer, generate_answer_for_pdf


app = FastAPI(
    title="Academic RAG Assistant API",
    description="Ask questions about academic documents.",
    version="1.1.0"
)

# Only allow PDFs stored by the Express backend.
UPLOADS_DIR = (
    Path(__file__).resolve().parent / "backend" / "uploads"
).resolve()


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class DocumentQuestionRequest(QuestionRequest):
    file_path: str = Field(min_length=1, max_length=1000)


def format_sources(sources):
    return [
        {
            "page_number": source["page_number"],
            "chunk_index": source["chunk_index"],
            "similarity": round(source["score"], 4)
        }
        for source in sources
    ]


@app.get("/")
def home():
    return {"message": "Academic RAG API is running!"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/ask")
def ask_question(request: QuestionRequest):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:
        answer, sources = generate_answer(question)

        return {
            "question": question,
            "answer": answer,
            "sources": format_sources(sources)
        }
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate an answer."
        )


@app.post("/ask-document")
def ask_about_document(request: DocumentQuestionRequest):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:
        pdf_path = Path(request.file_path).resolve()

        # Only accept files directly inside backend/uploads.
        if pdf_path.parent != UPLOADS_DIR:
            raise HTTPException(
                status_code=400,
                detail="Invalid document path."
            )

        if pdf_path.suffix.lower() != ".pdf" or not pdf_path.is_file():
            raise HTTPException(
                status_code=404,
                detail="Uploaded PDF not found."
            )

        answer, sources = generate_answer_for_pdf(
            question,
            pdf_path
        )

        return {
            "question": question,
            "answer": answer,
            "sources": format_sources(sources)
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to answer from this document."
        )
