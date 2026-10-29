
import pymupdf
from pathlib import Path

pdf_path = Path("documents/sample.pdf")
output_path = Path("extracted_text/extracted.txt")

output_path.parent.mkdir(parents=True, exist_ok=True)

with pymupdf.open(pdf_path) as pdf:
    with output_path.open("w", encoding="utf-8") as output:
        for page_number, page in enumerate(pdf, start=1):
            text = page.get_text("text")

            output.write(
                f"\n--- Page {page_number} ---\n"
            )
            output.write(text)

print(f"Extracted text from {len(pdf)} pages.")
print(f"Saved extracted text to: {output_path}")

