
from pathlib import Path
import re

import pymupdf
import tiktoken
from sentence_transformers import SentenceTransformer


# Use the same settings as your existing pipeline.
MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

encoding = tiktoken.get_encoding("cl100k_base")


def split_into_chunks(text, page_number):
    """Split one PDF page into overlapping chunks."""
    tokens = encoding.encode(text)
    chunks = []

    start = 0
    chunk_index = 0

    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunk_text = encoding.decode(tokens[start:end]).strip()

        if chunk_text:
            chunks.append({
                "chunk_index": chunk_index,
                "page_number": page_number,
                "text": chunk_text,
                "token_count": end - start,
            })
            chunk_index += 1

        if end == len(tokens):
            break

        start = end - CHUNK_OVERLAP

    return chunks


def process_pdf(pdf_path, embedding_model):
    """
    Extract text from a PDF and return chunks with embeddings.
    Nothing is written to the existing shared index.
    """
    pdf_path = Path(pdf_path)

    if not pdf_path.is_file():
        raise FileNotFoundError("The selected PDF file was not found.")

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError("Only PDF files can be processed.")

    all_chunks = []

    try:
        with pymupdf.open(pdf_path) as pdf:
            if pdf.is_encrypted:
                raise ValueError("Password-protected PDFs are not supported.")

            if len(pdf) == 0:
                raise ValueError("The PDF contains no pages.")

            for page_number, page in enumerate(pdf, start=1):
                text = page.get_text("text").strip()

                if not text:
                    continue

                page_chunks = split_into_chunks(text, page_number)
                all_chunks.extend(page_chunks)

    except ValueError:
        raise
    except Exception as error:
        raise ValueError(
            "Could not read this PDF. Check that it is a valid PDF."
        ) from error

    if not all_chunks:
        raise ValueError(
            "No extractable text was found. "
            "The PDF may contain scanned images and need OCR."
        )

    # Generate embeddings using the same model as semantic_search.py.
    vectors = embedding_model.encode(
        [chunk["text"] for chunk in all_chunks],
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    for chunk, vector in zip(all_chunks, vectors):
        chunk["embedding"] = vector.tolist()

    return all_chunks
