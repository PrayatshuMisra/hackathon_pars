import os
import re
import json
# Configure Gemini will happen on-demand inside extraction functions

def extract_text_from_pdf(file_bytes):
    """Extracts raw text from a PDF file."""
    try:
        from pypdf import PdfReader
        from io import BytesIO
        
        reader = PdfReader(BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"PDF Text Extraction Error: {e}")
        return ""

def extract_vitals_from_pdf(file_bytes):
    """
    Scans a PDF for medical details using Google Gemini API.
    Returns a dictionary of structured patient data.
    """
    print(f"[PARS] Extracting text from PDF (Size: {len(file_bytes)} bytes)...")
    text = extract_text_from_pdf(file_bytes)
    print(f"[PARS] Extracted text length: {len(text)}")
    
    # Import dependencies locally to avoid blocking Uvicorn startup
    import os
    import google.generativeai as genai
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    GEMINI_API_KEY = os.getenv("VITE_GEMINI_API_KEY")
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
    else:
        print("[PARS] WARNING: GEMINI_API_KEY not found in environment variables.")

    if not text or len(text.strip()) < 50:
        print("[PARS] WARNING: Extracted text is very short or empty. Likely a scanned PDF/Image.")
        
    if not GEMINI_API_KEY:
        print("[PARS] Fallback to legacy regex parser (No API Key)")
        return extract_vitals_regex_fallback(text)

    # List of models to try in order of preference (Fastest -> Most Capable -> Legacy)
    # User has access to Gemini 2.5 Flash, so we prioritize that.
    models_to_try = [
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-pro'
    ]
    
    model = None
    last_exception = None

    for model_name in models_to_try:
        try:
            print(f"[PARS] Attempting to use model: {model_name}...")
            model = genai.GenerativeModel(model_name)
            
            # 1. Try extracting text first to check if it's a digital PDF
            text_content = extract_text_from_pdf(file_bytes)
            is_digital = len(text_content) > 100
            
            prompt_content = ""
            request_parts = []
            
            if is_digital:
                print("[PARS] Digital PDF detected. Prioritizing Text extraction...")
                prompt_content = f"""
                You are a specialized medical OCR assistant. Extract patient data from this clinical text.
                
                EXTRACT THESE EXACT KEYS (JSON):
                - name: Full Name (Look for "Name:", "Pt:", "Patient:")
                - Age: Integer (Look for "Age:", "Y/O", e.g. "30Y")
                - Gender: "Male"/"Female" (Look for "M", "F", "Sex:")
                - Chief_Complaint: Diagnosis, Symptoms, or "Rx" reason.
                
                VITALS (Default if missing):
                - Heart_Rate (75), Systolic_BP (120), Diastolic_BP (80)
                - O2_Saturation (98.0), Temperature (37.0)
                - Respiratory_Rate (16), Pain_Score (0), GCS_Score (15)
                
                CLINICAL:
                - Arrival_Mode: "Walk-in" or "Ambulance" (Default "Walk-in")
                - Diabetes (bool), Hypertension (bool), Heart_Disease (bool)
                
                RULES:
                - If Age is given as "30/M", split it: Age=30, Gender=Male.
                - Output JSON ONLY.
                
                TEXT:
                {text_content[:25000]}
                """
                request_parts = [prompt_content]
            else:
                print("[PARS] Scanned/Image PDF detected. Using VISION extraction (Multimodal)...")
                prompt_content = """
                Analyze this medical document image (Prescription/Report). 
                Extract structured patient data into JSON format.
                
                KEYS REQUIRED:
                - name: Patient Name
                - Age: Patient Age (int)
                - Gender: Patient Gender (Male/Female)
                - Chief_Complaint: Main diagnosis/symptoms listed.
                
                VITALS (Values or Defaults):
                - Heart_Rate (default 75)
                - Systolic_BP (default 120)
                - Diastolic_BP (default 80)
                - O2_Saturation (default 98.0)
                - Temperature (default 37.0)
                - Respiratory_Rate (default 16)
                - Pain_Score (default 0)
                - GCS_Score (default 15)
                
                CLINICAL info:
                - Arrival_Mode: "Walk-in" or "Ambulance"
                - Diabetes: boolean
                - Hypertension: boolean
                - Heart_Disease: boolean
                
                Look closely for handwritten values.
                RETURN RAW JSON ONLY. NO MARKDOWN.
                """
                pdf_part = {
                    "mime_type": "application/pdf",
                    "data": file_bytes
                }
                request_parts = [prompt_content, pdf_part]

            # Call Gemini
            response = model.generate_content(request_parts)
            
            print(f"[PARS] Success with model: {model_name}")
            response_text = response.text.strip()
            
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
                
            data = json.loads(response_text)
            print(f"[PARS] Extracted: {list(data.keys())}")
            return data

        except Exception as e:
            print(f"[PARS] Failed with model {model_name}: {e}")
            last_exception = e
            continue  # Try next model

    # If all models failed
    error_msg = f"All Gemini models failed. Last error: {str(last_exception)}"
    print(error_msg)
    with open("ocr_debug.log", "a") as f:
        f.write(f"\n[ERROR] {error_msg}\n")
    
    return extract_vitals_regex_fallback(text if 'text' in locals() else "")

def extract_vitals_regex_fallback(text):
    """Legacy Regex extraction as a fallback"""
    text_lower = text.lower().replace('\n', ' ')
    extracted_data = {}

    # Basic Regex Patterns (Same as before)
    hr_match = re.search(r'(heart rate|pulse|hr)\s*[:=-]?\s*(\d{2,3})', text_lower)
    if hr_match: extracted_data['Heart_Rate'] = int(hr_match.group(2))

    bp_match = re.search(r'(bp|blood pressure)\s*[:=-]?\s*(\d{2,3})\s*[/-]\s*(\d{2,3})', text_lower)
    if bp_match: 
        extracted_data['Systolic_BP'] = int(bp_match.group(2))
        extracted_data['Diastolic_BP'] = int(bp_match.group(3))

    # ... (Keep other regexes if needed, or just return empty for now to keep it simple)
    return extracted_data