
from pathlib import Path
import tiktoken
import json
import re

# Input and output files
INPUT_FILE = Path("extracted_text/extracted.txt")
OUTPUT_FILE = Path("extracted_text/chunks.json")

# Chunk configuration
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

# Tokenizer used for counting tokens
encoding = tiktoken.get_encoding("cl100k_base")


def split_into_chunks(text):
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
                "text": chunk_text,
                "token_count": end - start
            })
            chunk_index += 1

        if end == len(tokens):
            break

        start = end - CHUNK_OVERLAP

    return chunks


def main():
    if not INPUT_FILE.exists():
        print("Input file not found. Run extract_text.py first.")
        return

    text = INPUT_FILE.read_text(encoding="utf-8")

    # Separate the text by page markers added by extract_text.py
    pages = re.split(r"--- Page (\d+) ---", text)

    all_chunks = []

    # Each page retains its page number.
    for i in range(1, len(pages), 2):
        page_number = int(pages[i])
        page_text = pages[i + 1].strip()

        if not page_text:
            continue

        page_chunks = split_into_chunks(page_text)

        for chunk in page_chunks:
            chunk["page_number"] = page_number
            all_chunks.append(chunk)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(all_chunks, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print(f"Pages processed: {len(pages) // 2}")
    print(f"Total chunks created: {len(all_chunks)}")
    print(f"Saved chunks to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
