
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY is missing from your .env file."
    )

client = genai.Client(api_key=api_key)

print(f"Testing Gemini model: {model_name}")

try:
    response = client.models.generate_content(
        model=model_name,
        contents="Reply with exactly: Gemini API connection successful."
    )

    print(response.text)

except Exception as error:
    print(f"Gemini request failed: {error}")
