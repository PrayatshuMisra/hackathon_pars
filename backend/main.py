"""
PARS - FastAPI Backend
Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
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
import json

app = FastAPI(title="PARS Triage API", version="1.0.0")

# CORS - allow your Lovable frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
    explainability: Optional[List[Dict[str, Any]]] = None


@app.get("/")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", response_model=TriageResponse)
def predict(patient: PatientInput):
    # Fallback mode: Use rule-based risk assessment if ML model isn't loaded
    if model is None:
        print("[PARS] WARNING: Using fallback mode (ML model not available)")
        # Load Clinical Rules Engine
        try:
            with open("clinical_rules.json", "r") as f:
                rules_engine = json.load(f)
        except Exception as e:
            print(f"[PARS] Error loading rules: {e}")
            rules_engine = {"base_score": 0.05, "rules": []}
            
        base_score = rules_engine.get("base_score", 0.05)
        penalties = 0.0
        details_list = []
        
        # Evaluate rules dynamically
        for rule in rules_engine.get("rules", []):
            metric_val = getattr(patient, rule["metric"], None)
            if metric_val is None:
                continue
                
            for cond in rule["conditions"]:
                matched = False
                op = cond["operator"]
                val = cond["value"]
                if op == ">" and metric_val > val: matched = True
                elif op == ">=" and metric_val >= val: matched = True
                elif op == "<" and metric_val < val: matched = True
                elif op == "<=" and metric_val <= val: matched = True
                elif op == "==" and metric_val == val: matched = True
                
                if matched:
                    penalties += cond["penalty"]
                    details_list.append(cond["detail"])
                    break # Apply highest severity condition only (assuming they are ordered correctly, or just first match)

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
            details = f"Vitals within acceptable range (Evaluated via {rules_engine.get('protocol', 'Standard Protocol')})"
        else:
            prefix = f"⚠️ Critical vitals detected (Evaluated via {rules_engine.get('protocol', 'Standard Protocol')}): " if risk_label == "HIGH" else "Elevated vitals requiring attention: "
            details = prefix + ", ".join(details_list)
        
        result = {
            "risk_score": risk_score,
            "risk_label": risk_label,
            "details": details,
            "explainability": [{"feature": "Rule_Based", "contribution": "Fallback", "value": "No ML"}]
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
        "referral": referral_data,
        "explainability": [{"feature": "Self_Check_In", "contribution": "Default", "value": "LOW"}]
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

# --- MOCK FHIR INTEGRATION ---
class FHIRPatient(BaseModel):
    resourceType: str = "Patient"
    name: List[Dict[str, Any]]
    gender: str
    birthDate: Optional[str] = None

class FHIREncounter(BaseModel):
    resourceType: str = "Encounter"
    status: str
    subject: Dict[str, str]
    period: Dict[str, str]

@app.post("/fhir/Patient")
def create_fhir_patient(patient: FHIRPatient):
    """
    Mock FHIR Endpoint to demonstrate EMR integration (Epic/Cerner).
    """
    return {
        "id": "mock-fhir-id-12345",
        "resourceType": "Patient",
        "status": "success",
        "message": "Patient successfully synced to mock EMR via FHIR HL7."
    }

@app.post("/fhir/Encounter")
def create_fhir_encounter(encounter: FHIREncounter):
    """
    Mock FHIR Endpoint for triage encounters.
    """
    return {
        "id": "mock-encounter-id-67890",
        "resourceType": "Encounter",
        "status": "success",
        "message": "Triage encounter recorded in mock EMR."
    }

# --- WEBSOCKETS FOR WEARABLE INTEGRATION ---
active_dashboards = []

@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """Frontend React dashboard connects here to listen for live vitals."""
    await websocket.accept()
    active_dashboards.append(websocket)
    try:
        while True:
            # Keep connection open, waiting for dashboard to disconnect
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_dashboards.remove(websocket)

@app.websocket("/ws/vitals/{patient_id}")
async def wearable_stream(websocket: WebSocket, patient_id: str):
    """The simulated wearable connects here and pushes vitals."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            
            # Broadcast to all connected dashboards
            for dashboard in active_dashboards:
                try:
                    await dashboard.send_json({
                        "patient_id": patient_id, 
                        "vitals": data
                    })
                except Exception:
                    # Ignore if dashboard drops connection midway
                    pass
    except WebSocketDisconnect:
        print(f"[PARS] Wearable disconnected for patient {patient_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
