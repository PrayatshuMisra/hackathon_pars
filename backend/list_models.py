import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("VITE_GEMINI_API_KEY")

if not api_key:
    print("No API Key found")
    exit()

genai.configure(api_key=api_key)

print("Listing available models...")
try:
    count = 0
    for m in genai.list_models():
        count += 1
        print(f"Model: {m.name}")
        print(f"Supported methods: {m.supported_generation_methods}")
    
    if count == 0:
        print("No models found. Check API Key permissions/quota.")

except Exception as e:
    print(f"\nCRITICAL ERROR listing models: {e}")
    # Print detailed info if available
    if hasattr(e, 'message'):
        print(e.message)
