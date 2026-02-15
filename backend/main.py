"""
PARS - FastAPI Backend
Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from typing import Optional, List, Dict, Any
from ml_service import TriageModel
from fastapi import FastAPI, UploadFile, File
from doc_parser import extract_vitals_from_pdf
from dept_service import get_referral, get_department
from audio_service import AudioService
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

# Load model on startup
try:
    model = TriageModel()
    print("[PARS] Model loaded successfully.")
except Exception as e:
    print(f"[PARS] WARNING: Could not load model: {e}")
    model = None

# Load Audio Service
try:
    audio_service = AudioService()
except Exception as e:
    print(f"[PARS] Audio Service Error: {e}")
    audio_service = None


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
        
        # Determine risk based on critical thresholds
        critical_reasons = []
        if hr > 180 or hr < 40:
            critical_reasons.append("Abnormal heart rate")
        if systolic < 70:
            critical_reasons.append("Severe hypotension")
        if o2 < 85:
            critical_reasons.append("Critical hypoxia")
        if gcs <= 8:
            critical_reasons.append("Reduced consciousness")
        
        if critical_reasons:
            risk_score = 0.95
            risk_label = "HIGH"
            details = "⚠️ Critical vitals detected: " + ", ".join(critical_reasons)
        elif hr > 100 or systolic < 90 or o2 < 94:
            risk_score = 0.55
            risk_label = "MEDIUM"
            details = "Elevated vitals requiring attention"
        else:
            risk_score = 0.15
            risk_label = "LOW"
            details = "Vitals within acceptable range"
        
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
