
from pathlib import Path
import json
import re

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer


# --------------------------------------------------
# Configuration
# --------------------------------------------------

INPUT_FILE = Path("extracted_text/chunks_with_embeddings.json")
MODEL_NAME = "all-MiniLM-L6-v2"
TOP_K = 8
RRF_CONSTANT = 60


# --------------------------------------------------
# Tokenization for keyword search
# --------------------------------------------------

def tokenize(text):
    """Convert text to lowercase word tokens."""
    return re.findall(r"\b\w+\b", text.lower())


# --------------------------------------------------
# Load saved chunks and embeddings
# --------------------------------------------------

def load_chunks():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            "chunks_with_embeddings.json not found. "
            "Run generate_embeddings.py first."
        )

    chunks = json.loads(
        INPUT_FILE.read_text(encoding="utf-8")
    )

    if not chunks:
        raise ValueError("No chunks found in the input file.")

    for chunk in chunks:
        if "embedding" not in chunk or not chunk["embedding"]:
            raise ValueError(
                f"Chunk {chunk.get('chunk_index')} "
                "has no embedding."
            )

    return chunks


# --------------------------------------------------
# Hybrid search
# --------------------------------------------------

def search(query, model, chunks):
    if not query.strip():
        return []

    # 1. Semantic search
    query_vector = model.encode(
        query,
        normalize_embeddings=True
    )

    chunk_vectors = np.array(
        [chunk["embedding"] for chunk in chunks],
        dtype=np.float32
    )

    semantic_scores = chunk_vectors @ query_vector

    semantic_ranking = np.argsort(
        semantic_scores
    )[::-1]

    # 2. Keyword search using BM25
    tokenized_chunks = [
        tokenize(chunk["text"])
        for chunk in chunks
    ]

    bm25 = BM25Okapi(tokenized_chunks)
    query_tokens = tokenize(query)
    bm25_scores = bm25.get_scores(query_tokens)

    keyword_ranking = np.argsort(
        bm25_scores
    )[::-1]

    # 3. Combine rankings using Reciprocal Rank Fusion
    hybrid_scores = np.zeros(
        len(chunks),
        dtype=np.float64
    )

    for rank, index in enumerate(
        semantic_ranking, start=1
    ):
        hybrid_scores[index] += (
            1.0 / (RRF_CONSTANT + rank)
        )

    for rank, index in enumerate(
        keyword_ranking, start=1
    ):
        hybrid_scores[index] += (
            1.0 / (RRF_CONSTANT + rank)
        )

    # 4. Select the top chunks by hybrid relevance
    ranked_indices = np.argsort(
        hybrid_scores
    )[::-1]

    top_indices = ranked_indices[
        :min(TOP_K, len(chunks))
    ]

    selected_indices = set(
        top_indices.tolist()
    )

    # 5. Add adjacent chunks to preserve context
    for index in top_indices:
        if index > 0:
            selected_indices.add(index - 1)

        if index + 1 < len(chunks):
            selected_indices.add(index + 1)

    # Keep results ranked by relevance, not page number
    final_indices = [
        index
        for index in ranked_indices
        if index in selected_indices
    ]

    # 6. Build results
    results = []

    for index in final_indices:
        chunk = chunks[index]

        results.append({
            "score": float(semantic_scores[index]),
            "bm25_score": float(bm25_scores[index]),
            "hybrid_score": float(hybrid_scores[index]),
            "page_number": chunk.get(
                "page_number", "Unknown"
            ),
            "chunk_index": chunk.get(
                "chunk_index", index
            ),
            "text": chunk["text"]
        })

    return results


# --------------------------------------------------
# Interactive testing
# --------------------------------------------------

def main():
    chunks = load_chunks()

    print("Loading embedding model...")
    model = SentenceTransformer(MODEL_NAME)

    print("\nHybrid Search Ready!")
    print("Search method: Semantic + BM25")
    print(f"Top K: {TOP_K}")
    print("Adjacent chunks: Enabled")
    print("Type 'exit' to quit.\n")

    while True:
        query = input("Your question: ").strip()

        if query.lower() == "exit":
            print("Search ended.")
            break

        if not query:
            print("Please enter a question.\n")
            continue

        results = search(query, model, chunks)

        print("\nMost relevant chunks:\n")

        for rank, result in enumerate(
            results, start=1
        ):
            print(f"Rank: {rank}")
            print(
                f"Hybrid score: "
                f"{result['hybrid_score']:.6f}"
            )
            print(
                f"Semantic similarity: "
                f"{result['score']:.4f}"
            )
            print(
                f"BM25 score: "
                f"{result['bm25_score']:.4f}"
            )
            print(f"Page: {result['page_number']}")
            print(f"Chunk: {result['chunk_index']}")
            print(f"Text:\n{result['text']}")
            print("Text length:", len(result["text"]))
            print("Text preview:", repr(result["text"][:500]))
            print("-" * 60)
            

if __name__ == "__main__":
    main()
