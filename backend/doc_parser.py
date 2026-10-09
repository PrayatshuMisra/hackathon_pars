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

def extract_text_with_ocr(file_bytes):
    """
    Uses EasyOCR and PyPDFium2 to extract text from scanned PDFs or Images 
    locally, without any cloud APIs.
    """
    try:
        import easyocr
        import pypdfium2 as pdfium
        from PIL import Image
        import numpy as np
        from io import BytesIO

        print("[PARS OCR] Initializing Local EasyOCR Model...")
        # Load the OCR reader (uses CPU or GPU automatically)
        reader = easyocr.Reader(['en'], gpu=False)
        
        text_output = []
        
        # Determine if it's a PDF or an Image
        # Check magic bytes for PDF (%PDF)
        if file_bytes.startswith(b'%PDF'):
            print("[PARS OCR] Converting Scanned PDF to images for OCR...")
            pdf = pdfium.PdfDocument(file_bytes)
            for i in range(len(pdf)):
                page = pdf[i]
                # Render to PIL Image
                pil_image = page.render(scale=2.0).to_pil()
                # Convert to numpy array for EasyOCR
                img_array = np.array(pil_image)
                # Extract text
                result = reader.readtext(img_array, detail=0)
                text_output.extend(result)
        else:
            print("[PARS OCR] Processing direct Image file for OCR...")
            # Try to open as image
            pil_image = Image.open(BytesIO(file_bytes))
            img_array = np.array(pil_image)
            result = reader.readtext(img_array, detail=0)
            text_output.extend(result)

        full_text = " ".join(text_output)
        print(f"[PARS OCR] Extraction complete. Read {len(full_text)} chars.")
        return full_text
    except Exception as e:
        print(f"[PARS OCR] Local OCR Failed: {e}")
        return ""

def extract_vitals_from_pdf(file_bytes):
    """
    Scans a PDF for medical details using a fast local Python regex model.
    Returns a dictionary of structured patient data instantly without API delays.
    """
    print(f"[PARS] Extracting text from PDF (Size: {len(file_bytes)} bytes) using Local Code Model...")
    text = extract_text_from_pdf(file_bytes)
    
    # If text is too short, it's likely a scanned PDF or image. Trigger local OCR.
    if not text or len(text.strip()) < 50:
        print("[PARS] Detected Scanned Document. Triggering Local OCR Model...")
        ocr_text = extract_text_with_ocr(file_bytes)
        if ocr_text:
            text = ocr_text

    print(f"[PARS] Extracted text length: {len(text)}")
    
    if not text or len(text.strip()) < 10:
        print("[PARS] WARNING: Extracted text is very short or empty. Returning default payload.")
        return extract_vitals_regex_fallback("")

    text_lower = text.lower().replace('\n', ' ')
    data = {}

    # 1. Identity (Name, Age, Gender)
    name_match = re.search(r'\b(?:name)\s*[:=-]\s*([a-zA-Z\s\.\-]{2,30}?)(?=\s+(?:age|sex|dob|arrival|history|patient|\n|$))', text, re.IGNORECASE)
    if not name_match:
        # Fallback to older loose matching if strict 'name:' fails
        name_match = re.search(r'(?:pt|patient name)[\s:]*([a-zA-Z\s\.\-]{3,30})(?:\s|$|age|sex|dob)', text, re.IGNORECASE)
        
    if name_match:
        data["name"] = name_match.group(1).strip()
    else:
        data["name"] = "Unknown Patient"

    age_match = re.search(r'(?:age|y/o)(?:[\s/a-z:]*)(\d{1,3})', text_lower)
    if age_match:
        data["Age"] = int(age_match.group(1))
    else:
        # Check for formats like "30/M" or "45 y", ensuring we don't match "28/min"
        age_match_2 = re.search(r'\b(\d{1,3})\s*(?:y/?o|yrs?|/m\b|/f\b|/male|/female)', text_lower)
        data["Age"] = int(age_match_2.group(1)) if age_match_2 else 45

    if re.search(r'\b(female| f | /f|/female)\b', text_lower):
        data["Gender"] = "Female"
    elif re.search(r'\b(male| m | /m|/male)\b', text_lower):
        data["Gender"] = "Male"
    else:
        data["Gender"] = "Unknown"

    # 2. Vitals
    hr_match = re.search(r'(?:heart rate|pulse|hr)\s*[:=-]?\s*(\d{2,3})', text_lower)
    data["Heart_Rate"] = int(hr_match.group(1)) if hr_match else 75

    bp_match = re.search(r'(?:bp|blood pressure)\s*[:=-]?\s*(\d{2,3})\s*[/-]\s*(\d{2,3})', text_lower)
    if bp_match:
        data["Systolic_BP"] = int(bp_match.group(1))
        data["Diastolic_BP"] = int(bp_match.group(2))
    else:
        data["Systolic_BP"] = 120
        data["Diastolic_BP"] = 80

    o2_match = re.search(r'(?:spo2|o2 sat|o2 saturation|oxygen)\s*[:=-]?\s*(\d{2,3})(?:\s*%)?', text_lower)
    data["O2_Saturation"] = float(o2_match.group(1)) if o2_match else 98.0

    temp_match = re.search(r'(?:temp|temperature)\s*[:=-]?\s*(\d{2}(?:\.\d)?)(?:\s*c|f)?', text_lower)
    data["Temperature"] = float(temp_match.group(1)) if temp_match else 37.0
    if data["Temperature"] > 50:
        data["Temperature"] = round((data["Temperature"] - 32) * 5.0/9.0, 1)

    rr_match = re.search(r'(?:rr|resp\s*rate|respiratory rate)\s*[:=-]?\s*(\d{1,2})', text_lower)
    data["Respiratory_Rate"] = int(rr_match.group(1)) if rr_match else 16

    pain_match = re.search(r'(?:pain|pain score)\s*[:=-]?\s*(\d{1,2})(?:\s*/\s*10)?', text_lower)
    data["Pain_Score"] = int(pain_match.group(1)) if pain_match else 0

    gcs_match = re.search(r'(?:gcs|gcs\s*score|glasgow)\s*[:=-]?\s*(\d{1,2})(?:\s*/\s*15)?', text_lower)
    data["GCS_Score"] = int(gcs_match.group(1)) if gcs_match else 15

    # 3. Clinical & History
    data["Arrival_Mode"] = "Ambulance" if "ambulance" in text_lower else "Walk-in"
    data["Diabetes"] = bool(re.search(r'\b(?:dm|diabetes|diabetic)\b', text_lower))
    data["Hypertension"] = bool(re.search(r'\b(?:htn|hypertension|high bp)\b', text_lower))
    data["Heart_Disease"] = bool(re.search(r'\b(?:cad|chf|heart disease|mi)\b', text_lower))

    # 4. Chief Complaint
    cc_match = re.search(r'(?:chief complaint|cc|dx|diagnosis|reason for visit|symptoms)\s*[:=-]?\s*(.*?)(?=\b(?:objective|vitals|metric|heart rate|hr|bp|blood pressure|temperature|temp|spo2)\b|$)', text_lower, re.DOTALL)
    if cc_match and len(cc_match.group(1).strip()) > 3:
        # Clean up any trailing labels like '& symptoms'
        cc_text = re.sub(r'&\s*symptoms$', '', cc_match.group(1).strip()).strip()
        data["Chief_Complaint"] = cc_text.title()
    else:
        data["Chief_Complaint"] = "General Evaluation"

    print(f"[PARS] Extracted Local JSON: {list(data.keys())}")
    return data

def extract_vitals_regex_fallback(text):
    """Fallback if literally everything is empty"""
    return {
        "name": "Unknown", "Age": 45, "Gender": "Unknown", "Heart_Rate": 75,
        "Systolic_BP": 120, "Diastolic_BP": 80, "O2_Saturation": 98.0,
        "Temperature": 37.0, "Respiratory_Rate": 16, "Pain_Score": 0,
        "GCS_Score": 15, "Arrival_Mode": "Walk-in", "Diabetes": False,
        "Hypertension": False, "Heart_Disease": False, "Chief_Complaint": "None"
    }