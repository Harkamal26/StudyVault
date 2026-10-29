
from pathlib import Path
import json
from sentence_transformers import SentenceTransformer

INPUT_FILE = Path("extracted_text/chunks.json")
OUTPUT_FILE = Path("extracted_text/chunks_with_embeddings.json")


def main():
    if not INPUT_FILE.exists():
        print("chunks.json not found. Run chunk_text.py first.")
        return

    # Load the text chunks created in the previous step
    chunks = json.loads(INPUT_FILE.read_text(encoding="utf-8"))

    if not chunks:
        print("No chunks found in chunks.json.")
        return

    # Load a pretrained embedding model
    print("Loading embedding model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # Convert each chunk's text into a numerical vector
    texts = [chunk["text"] for chunk in chunks]

    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=True
    )

    # Attach each vector to its corresponding chunk
    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding.tolist()

    # Save the chunks and their embeddings
    OUTPUT_FILE.write_text(
        json.dumps(chunks, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print(f"Total chunks embedded: {len(chunks)}")
    print("Vector dimensions: 384")
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
