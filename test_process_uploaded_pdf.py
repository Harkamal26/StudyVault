
from sentence_transformers import SentenceTransformer
from process_uploaded_pdf import process_pdf, MODEL_NAME

# Temporarily test using your existing sample PDF.
pdf_path = "documents/sample.pdf"

print("Loading embedding model...")
model = SentenceTransformer(MODEL_NAME)

print("Processing PDF...")
chunks = process_pdf(pdf_path, model)

print(f"\nPDF processed successfully!")
print(f"Total chunks: {len(chunks)}")
print(f"First chunk page: {chunks[0]['page_number']}")
print(f"First chunk text: {chunks[0]['text'][:200]}")
print(f"Embedding dimensions: {len(chunks[0]['embedding'])}")
