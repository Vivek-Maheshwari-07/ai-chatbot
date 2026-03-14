import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

with open('test_output.txt', 'w') as f:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            f.write(f"Found: {m.name}\n")

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        f.write("\nTesting gemini-1.5-flash...\n")
        response = model.generate_content("Hello")
        f.write(f"Success: {response.text}\n")
    except Exception as e:
        f.write(f"Failed gemini-1.5-flash: {e}\n")

    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        f.write("\nTesting models/gemini-2.5-flash...\n")
        response = model.generate_content("Hello")
        f.write(f"Success: {response.text}\n")
    except Exception as e:
        f.write(f"Failed models/gemini-2.5-flash: {e}\n")
