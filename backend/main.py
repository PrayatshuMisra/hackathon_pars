"""
PARS - FastAPI Backend
Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File
from doc_parser import extract_vitals_from_pdf
# We will import these dynamically to avoid blocking startup
from dept_service import get_referral, get_department
import os
import shutil

app = FastAPI(title="PARS Triage API", version="1.0.0")

# CORS - allow your Lovable frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    # allow_origins=[
    #     "http://localhost:5173",
    #     "http://localhost:3000",
    #     "http://127.0.0.1:5173",
    #     "http://127.0.0.1:3000",
    #     "https://*.lovable.app",
    # ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import threading

# Initialize globals
model = None
audio_service = None
extract_vitals_from_pdf = None

def load_models_background():
    global model, audio_service, extract_vitals_from_pdf
    
    print("[PARS] Starting background loading of heavy ML modules...")
    
    # Import heavy modules inside thread to prevent blocking Uvicorn startup
    try:
        from ml_service import TriageModel
        model = TriageModel()
        print("[PARS] Model loaded successfully.")
    except Exception as e:
        print(f"[PARS] WARNING: Could not load model: {e}")
        model = None

    # Load Audio Service
    try:
        from audio_service import AudioService
        audio_service = AudioService()
        print("[PARS] Audio Service loaded successfully.")
    except Exception as e:
        print(f"[PARS] Audio Service Error: {e}")
        audio_service = None
        
    # Load Doc Parser
    try:
        from doc_parser import extract_vitals_from_pdf as _extract
        extract_vitals_from_pdf = _extract
        print("[PARS] Doc Parser loaded successfully.")
    except Exception as e:
        print(f"[PARS] Doc Parser Error: {e}")
        
    # Init NLP models for departments
    try:
        from dept_service import init_nlp_models
        init_nlp_models()
        print("[PARS] NLP Models for Departments initialized successfully.")
    except Exception as e:
        print(f"[PARS] Dept Service NLP config Error: {e}")

# Start background thread for loading models
threading.Thread(target=load_models_background, daemon=True).start()

class PatientInput(BaseModel):
    Age: int
    Gender: str
    Heart_Rate: int
    Systolic_BP: int
    Diastolic_BP: int
    O2_Saturation: float
    Temperature: float
    Respiratory_Rate: int
    Pain_Score: int = 0
    GCS_Score: int = 15
    Arrival_Mode: str = "Walk-in"
    Diabetes: bool = False
    Hypertension: bool = False
    Heart_Disease: bool = False
    Chief_Complaint: Optional[str] = None


class TriageResponse(BaseModel):
    risk_score: float
    risk_label: str
    details: str
    referral: Optional[Dict[str, Any]] = None


@app.get("/")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", response_model=TriageResponse)
def predict(patient: PatientInput):
    # Fallback mode: Use rule-based risk assessment if ML model isn't loaded
    if model is None:
        print("[PARS] WARNING: Using fallback mode (ML model not available)")
        # Simple rule-based risk assessment
        hr = patient.Heart_Rate
        systolic = patient.Systolic_BP
        o2 = patient.O2_Saturation
        gcs = patient.GCS_Score
        
        # Determine risk based on continuous scoring
        base_score = 0.05
        penalties = 0.0
        details_list = []
        
        # Heart Rate logic
        if hr > 180 or hr < 40:
            penalties += 0.60
            details_list.append("Abnormal heart rate")
        elif hr > 100:
            penalties += min(0.30, (hr - 100) * 0.005)
            details_list.append("Elevated heart rate")
        elif hr < 60:
            penalties += min(0.20, (60 - hr) * 0.01)
            
        # Blood pressure logic
        if systolic < 70:
            penalties += 0.60
            details_list.append("Severe hypotension")
        elif systolic < 90:
            penalties += min(0.30, (90 - systolic) * 0.015)
            details_list.append("Low blood pressure")
        elif systolic > 160:
            penalties += min(0.30, (systolic - 160) * 0.005)
            details_list.append("High blood pressure")
            
        # Oxygen logic
        if o2 < 85:
            penalties += 0.60
            details_list.append("Critical hypoxia")
        elif o2 < 94:
            penalties += min(0.30, (94 - o2) * 0.05)
            details_list.append("Low oxygen saturation")
            
        # GCS logic
        if gcs <= 8:
            penalties += 0.80
            details_list.append("Reduced consciousness")
        elif gcs < 15:
            penalties += min(0.40, (15 - gcs) * 0.05)
            
        # Age penalty
        if patient.Age and patient.Age > 65:
            penalties += min(0.15, (patient.Age - 65) * 0.005)

        # Calculate final continuous score
        risk_score = min(0.99, base_score + penalties)
        
        # Assign labels
        if risk_score >= 0.75:
            risk_label = "HIGH"
        elif risk_score >= 0.40:
            risk_label = "MEDIUM"
        else:
            risk_label = "LOW"
            
        if not details_list:
            details = "Vitals within acceptable range"
        else:
            prefix = "⚠️ Critical vitals detected: " if risk_label == "HIGH" else "Elevated vitals requiring attention: "
            details = prefix + ", ".join(details_list)
        
        result = {
            "risk_score": risk_score,
            "risk_label": risk_label,
            "details": details
        }
    else:
        # Use ML model if available
        result = model.predict(patient.dict())
    
    # 2. Determine Referral Logic
    # Use Chief Complaint if provided, otherwise fallback to the generated "details"
    referral_reason = patient.Chief_Complaint if patient.Chief_Complaint else result["details"]
    
    # 3. Get Department & Doctor List (THIS IS THE KEY PART - NLP DEPARTMENT CLASSIFICATION)
    referral_data = get_referral(referral_reason)
    
    # 4. Merge Results
    result["referral"] = referral_data
    
    return result

class SelfCheckInInput(BaseModel):
    name: str
    age: int
    gender: str
    symptoms: str

@app.post("/self-check-in", response_model=TriageResponse)
def self_check_in(data: SelfCheckInInput):
    """
    Simplified check-in for non-emergency cases. 
    Always returns LOW risk and determines department based on symptoms.
    """
    # 1. Determine Department
    dept = get_department(data.symptoms)
    
    # 2. Get Doctors/Referral Data
    referral_data = get_referral(data.symptoms)
    
    # 3. Construct Response
    return {
        "risk_score": 0.1,
        "risk_label": "LOW",
        "details": f"Self check-in completed. Based on '{data.symptoms}', we recommend visiting {dept.replace('_', ' ')}.",
        "referral": referral_data
    }

@app.post("/parse-document")
async def parse_document(file: UploadFile = File(...)):
    """
    Accepts a PDF, parses it, and returns the extracted vitals.
    """
    content = await file.read()
    
    # Run the parser
    extracted_data = extract_vitals_from_pdf(content)
    
    return {
        "status": "success",
        "filename": file.filename,
        "data": extracted_data
    }

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Accepts audio file (wav/webm/mp3), uses Whisper to transcribe.
    """
    if not audio_service:
        raise HTTPException(status_code=503, detail="Audio service unavailable.")
    
    # Save temp file
    temp_filename = f"temp_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        text = audio_service.transcribe(temp_filename)
        return {"text": text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup
        if os.path.exists(temp_filename):
            os.remove(temp_filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
