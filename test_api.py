
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

try:
    client = OpenAI()

    response = client.responses.create(
        model="gpt-5.5",
        input="Reply with exactly: API connection successful.",
        max_output_tokens=30
    )

    print("API connection successful!")
    print("Response:", response.output_text)

except Exception as error:
    print("API test failed.")
    print("Error:", error)
