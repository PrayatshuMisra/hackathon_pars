import os
import time
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer, util
import torch


# ============================================================
# ------------------- SUPABASE CONFIG ------------------------
# ============================================================

SUPABASE_URL = ""
SUPABASE_KEY = ""

try:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(base_dir, ".env")
    print(f"[PARS DEBUG] Looking for .env at: {env_path}")

    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if line.startswith("VITE_SUPABASE_URL"):
                    SUPABASE_URL = line.split("=")[1].strip().strip('"')
                elif line.startswith("VITE_SUPABASE_PUBLISHABLE_KEY"):
                    SUPABASE_KEY = line.split("=")[1].strip().strip('"')
        print(f"[PARS DEBUG] Loaded SUPABASE_URL: {SUPABASE_URL}")
    else:
        print("[PARS DEBUG] .env file NOT FOUND")

except Exception as e:
    print(f"[PARS] Error loading .env: {e}")

# Fallback (Temporary Prototype Fix)
if not SUPABASE_URL:
    print("[PARS] WARNING: Using hardcoded Supabase credentials.")
    SUPABASE_URL = "https://ddgvfnlsxbtggxlgsknp.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZ3ZmbmxzeGJ0Z2d4bGdza25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNjAyNDEsImV4cCI6MjA4NjYzNjI0MX0.KVvDw6qnimwvcarZ4caxYK8jiHRunPybRnXxvPDTPT4"

def get_supabase() -> Client:
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"[PARS] Error creating Supabase client: {e}")
        return None


# ============================================================
# ------------------- DEPARTMENTS ----------------------------
# ============================================================

DEPARTMENTS = [
    "Cardiology (Heart, Blood Pressure, Chest Pain, Cardiac Arrest, Heart Attack, Angina, Palpitations, Arrhythmia)",
    "Neurology (Brain, Nerves, Headache, Stroke, Seizure, Paralysis, Dizziness, Migraine, Numbness, Tremor)",
    "Gastroenterology (Stomach, Digestion, Vomiting, Abdominal Pain, Nausea, Diarrhea, Constipation, Ulcer, Gastritis)",
    "Pulmonology (Lungs, Breathing, Asthma, Cough, Shortness of Breath, Wheezing, Pneumonia, Bronchitis, Respiratory)",
    "Orthopedics (Bones, Joints, Fractures, Muscle Pain, Sprain, Dislocation, Arthritis, Back Pain, Limb Injury)",
    "Emergency_Trauma (Severe Injuries, Trauma, Accident, Shock, Bleeding, Hemorrhage, Major Wound, Severe Burn, Critical Injury)",
    "General_Medicine (Fever, Flu, Weakness, Fatigue, Cold, Viral Infection, General Illness, Malaise)",
    "Dermatology (Skin, Rashes, Itch, Allergy, Hives, Eczema, Psoriasis, Skin Lesion, Dermatitis)",
    "ENT (Ear, Nose, Throat, Sinus, Tonsillitis, Earache, Sore Throat, Nasal Congestion)",
    "Urology_Nephrology (Kidney, Bladder, Urine, UTI, Renal, Urinary Tract, Kidney Stone, Nephritis)",
    "Psychiatry (Mental Health, Depression, Anxiety, Panic Attack, Suicidal Thoughts, Psychosis, Bipolar, PTSD)",
    "Toxicology (Poisoning, Overdose, Chemicals, Alcohol, Snake Bite, Venom, Venomous, Toxic, Antidote, Drug Abuse, Intoxication, Scorpion Sting, Spider Bite, Insect Venom)",
    "Gynaecology (Irregular periods, Missed periods, Heavy bleeding, Spotting, Pelvic pain, Pregnancy, Infertility, Menopause, PCOS)"
]

# ============================================================
# ------------- MEDICAL KEYWORD BOOSTING --------------------
# ============================================================

# Medical keyword dictionary with weighted scores for each department
MEDICAL_KEYWORDS = {
    "Toxicology": {
        # Critical keywords - very high weight
        "snake bite": 1.0, "snakebite": 1.0, "venom": 0.95, "venomous": 0.95,
        "poison": 0.95, "poisoning": 0.95, "toxic": 0.9, "toxin": 0.9,
        "overdose": 0.95, "drug overdose": 1.0, "intoxication": 0.9,
        "scorpion": 0.9, "spider bite": 0.9, "insect venom": 0.85,
        "chemical exposure": 0.9, "antidote": 0.85, "ingested": 0.7,
        "swallowed poison": 0.95, "drank poison": 0.95, "toxic substance": 0.9,
        "alcohol poisoning": 0.9, "drug abuse": 0.8, "substance abuse": 0.75
    },
    "Emergency_Trauma": {
        "accident": 0.85, "trauma": 0.9, "severe injury": 0.95, "critical": 0.8,
        "bleeding": 0.85, "hemorrhage": 0.9, "major wound": 0.9,
        "car accident": 0.95, "fall": 0.7, "severe burn": 0.9,
        "gunshot": 0.95, "stab": 0.9, "crush injury": 0.9,
        "head trauma": 0.95, "unconscious": 0.85, "shock": 0.85
    },
    "Cardiology": {
        "chest pain": 0.95, "heart attack": 1.0, "cardiac arrest": 1.0,
        "angina": 0.9, "palpitations": 0.85, "heart": 0.7,
        "blood pressure": 0.75, "hypertension": 0.8, "arrhythmia": 0.85,
        "tachycardia": 0.85, "bradycardia": 0.85, "cardiac": 0.8
    },
    "Neurology": {
        "stroke": 0.95, "seizure": 0.95, "paralysis": 0.9, "headache": 0.7,
        "migraine": 0.8, "dizziness": 0.7, "numbness": 0.75, "tremor": 0.8,
        "brain": 0.7, "neurological": 0.85, "confusion": 0.7,
        "loss of consciousness": 0.85, "fainting": 0.75
    },
    "Gastroenterology": {
        "stomach pain": 0.85, "abdominal pain": 0.85, "vomiting": 0.8,
        "nausea": 0.75, "diarrhea": 0.8, "constipation": 0.75,
        "gastritis": 0.85, "ulcer": 0.85, "digestive": 0.7
    },
    "Pulmonology": {
        "breathing difficulty": 0.9, "shortness of breath": 0.9, "asthma": 0.85,
        "cough": 0.7, "wheezing": 0.8, "pneumonia": 0.85,
        "respiratory": 0.75, "lung": 0.7, "bronchitis": 0.8
    },
    "Orthopedics": {
        "fracture": 0.9, "broken bone": 0.95, "sprain": 0.8, "dislocation": 0.85,
        "joint pain": 0.75, "back pain": 0.75, "muscle pain": 0.7,
        "arthritis": 0.8, "limb injury": 0.85
    },
    "Psychiatry": {
        "suicidal": 0.95, "suicide": 0.95, "depression": 0.85, "anxiety": 0.8,
        "panic attack": 0.85, "psychosis": 0.9, "mental health": 0.8,
        "bipolar": 0.85, "ptsd": 0.85, "hallucination": 0.85
    },
    "Dermatology": {
        "rash": 0.8, "skin": 0.6, "itch": 0.75, "hives": 0.8,
        "eczema": 0.85, "psoriasis": 0.85, "allergy": 0.7,
        "dermatitis": 0.85, "skin lesion": 0.8
    },
    "ENT": {
        "ear pain": 0.85, "sore throat": 0.8, "tonsillitis": 0.85,
        "sinus": 0.75, "nasal": 0.7, "throat": 0.65,
        "earache": 0.8, "hearing loss": 0.8
    },
    "Urology_Nephrology": {
        "kidney": 0.8, "bladder": 0.8, "urinary": 0.75, "uti": 0.85,
        "kidney stone": 0.9, "renal": 0.8, "urine": 0.7
    },
    "Gynaecology": {
    "irregular periods": 0.85,
    "missed periods": 0.8,
    "heavy bleeding": 0.85,
    "spotting": 0.7,
    "pelvic pain": 0.8,
    "lower abdominal pain": 0.75,
    "vaginal discharge": 0.8,
    "foul smelling discharge": 0.85,
    "itching": 0.7,
    "burning sensation": 0.65,
    "pain during intercourse": 0.8,
    "menstrual cramps": 0.75,
    "pcos": 0.9,
    "pregnancy symptoms": 0.85,
    "infertility": 0.85,
    "menopause symptoms": 0.8
    },
    "General_Medicine": {
        "fever": 0.7, "flu": 0.75, "cold": 0.7, "fatigue": 0.6,
        "weakness": 0.6, "viral": 0.7, "malaise": 0.65
    }
}

def calculate_keyword_score(complaint: str, department: str) -> float:
    """
    Calculate keyword match score for a given complaint and department.
    Returns a score between 0.0 and 1.0.
    """
    if department not in MEDICAL_KEYWORDS:
        return 0.0
    
    complaint_lower = complaint.lower()
    keywords = MEDICAL_KEYWORDS[department]
    
    max_score = 0.0
    matched_keywords = []
    
    for keyword, weight in keywords.items():
        if keyword in complaint_lower:
            if weight > max_score:
                max_score = weight
            matched_keywords.append((keyword, weight))
    
    # If multiple keywords match, boost the score slightly
    if len(matched_keywords) > 1:
        max_score = min(1.0, max_score * 1.1)
    
    return max_score


# ============================================================
# ------------------- MODEL LOADING --------------------------
# ============================================================

MODEL_NAMES = [
    "multi-qa-distilbert-cos-v1",
    "all-MiniLM-L6-v2",
    "paraphrase-MiniLM-L6-v2"
]

MODELS = []
DEPT_EMBEDDINGS_MAP = {}

print("[PARS] Loading NLP Models...")

for name in MODEL_NAMES:
    try:
        model = SentenceTransformer(name)
        MODELS.append(model)
        print(f"[PARS] Loaded model: {name}")
    except Exception as e:
        print(f"[PARS] Failed loading {name}: {e}")

if not MODELS:
    print("[PARS] WARNING: No models loaded successfully.")
else:
    # Precompute department embeddings per model
    for model in MODELS:
        try:
            DEPT_EMBEDDINGS_MAP[model] = model.encode(
                DEPARTMENTS,
                convert_to_tensor=True
            )
        except Exception as e:
            print(f"[PARS] Error encoding departments for model: {e}")


# ============================================================
# -------- TIME-BASED MODEL SWITCHING (20 MIN) --------------
# ============================================================

def get_active_model():
    """
    Rotates model every 20 minutes (1200 seconds)
    """
    if not MODELS:
        return None

    current_time = int(time.time())
    index = (current_time // 1200) % len(MODELS)
    return MODELS[index]


# ============================================================
# ------------------- NLP CLASSIFICATION ---------------------
# ============================================================

def get_department(complaint: str) -> str:
    """
    Hybrid NLP + Keyword-based department classification.
    Combines semantic understanding with medical domain knowledge.
    """
    if not complaint or len(complaint.strip()) < 3:
        return "General_Medicine"

    complaint_lower = complaint.lower()
    
    # Step 1: Calculate keyword scores for all departments
    keyword_scores = {}
    for dept_full in DEPARTMENTS:
        dept_name = dept_full.split(" (")[0].strip()
        keyword_scores[dept_name] = calculate_keyword_score(complaint, dept_name)
    
    # Step 2: Get NLP scores
    nlp_scores = {}
    active_model = get_active_model()
    
    if active_model and active_model in DEPT_EMBEDDINGS_MAP:
        try:
            complaint_embedding = active_model.encode(
                complaint,
                convert_to_tensor=True
            )
            dept_embeddings = DEPT_EMBEDDINGS_MAP[active_model]
            cos_scores = util.cos_sim(
                complaint_embedding,
                dept_embeddings
            )[0]
            
            # Convert to dictionary
            for idx, dept_full in enumerate(DEPARTMENTS):
                dept_name = dept_full.split(" (")[0].strip()
                nlp_scores[dept_name] = float(cos_scores[idx])
        
        except Exception as e:
            print(f"[PARS] NLP Error: {e}")
    
    # Step 3: Hybrid scoring
    if nlp_scores:
        # Combine NLP and keyword scores
        hybrid_scores = {}
        for dept_name in keyword_scores.keys():
            nlp_score = nlp_scores.get(dept_name, 0.0)
            keyword_score = keyword_scores.get(dept_name, 0.0)
            
            # If keyword score is very high (>= 0.9), prioritize it
            if keyword_score >= 0.9:
                hybrid_scores[dept_name] = (nlp_score * 0.3) + (keyword_score * 0.7)
            # If keyword score is moderate, balance both
            elif keyword_score >= 0.5:
                hybrid_scores[dept_name] = (nlp_score * 0.5) + (keyword_score * 0.5)
            # Otherwise, prioritize NLP
            else:
                hybrid_scores[dept_name] = (nlp_score * 0.7) + (keyword_score * 0.3)
        
        # Find best match
        best_dept = max(hybrid_scores.items(), key=lambda x: x[1])
        best_dept_name = best_dept[0]
        best_score = best_dept[1]
        
        # Get top NLP and keyword matches for logging
        top_nlp = max(nlp_scores.items(), key=lambda x: x[1])
        top_keyword = max(keyword_scores.items(), key=lambda x: x[1])
        
        print(f"[PARS] Hybrid Classification:")
        print(f"  NLP Top: {top_nlp[0]} ({top_nlp[1]:.3f})")
        print(f"  Keyword Top: {top_keyword[0]} ({top_keyword[1]:.3f})")
        print(f"  Final: {best_dept_name} (hybrid score: {best_score:.3f})")
        
        return best_dept_name
    
    # Step 4: Fallback to keyword-only if NLP failed
    if keyword_scores:
        best_keyword_match = max(keyword_scores.items(), key=lambda x: x[1])
        if best_keyword_match[1] > 0.5:  # Confidence threshold
            print(f"[PARS] Keyword-only match: {best_keyword_match[0]} ({best_keyword_match[1]:.3f})")
            return best_keyword_match[0]
    
    # Step 5: Final fallback to legacy logic
    print(f"[PARS] Using legacy fallback")
    return get_department_legacy(complaint)


# ============================================================
# ------------------- KEYWORD FALLBACK -----------------------
# ============================================================

def get_department_legacy(complaint: str) -> str:
    """
    Enhanced legacy keyword-based fallback with comprehensive medical terms.
    """
    complaint = complaint.lower()

    hospital_map = {
        "Toxicology": [
            "poison", "overdose", "chemical", "toxic", "venom", "venomous",
            "snake bite", "snakebite", "scorpion", "spider bite", "antidote",
            "intoxication", "drug abuse", "ingested", "swallowed poison"
        ],
        "Emergency_Trauma": [
            "accident", "trauma", "bleed", "severe injury", "critical",
            "hemorrhage", "major wound", "car accident", "gunshot", "stab"
        ],
        "Cardiology": [
            "chest pain", "heart", "bp", "palpitations", "cardiac",
            "heart attack", "angina", "arrhythmia"
        ],
        "Neurology": [
            "stroke", "headache", "seizure", "paralysis", "migraine",
            "dizziness", "numbness", "brain"
        ],
        "Gastroenterology": [
            "stomach", "vomiting", "diarrhea", "abdominal", "nausea",
            "digestive", "gastritis", "ulcer"
        ],
        "Pulmonology": [
            "cough", "asthma", "breath", "lung", "respiratory",
            "wheezing", "pneumonia"
        ],
        "Orthopedics": [
            "fracture", "bone", "joint", "sprain", "dislocation",
            "back pain", "muscle pain"
        ],
        "Psychiatry": [
            "depression", "anxiety", "suicide", "suicidal", "panic",
            "mental health", "psychosis"
        ],
        "Dermatology": [
            "rash", "itch", "skin", "hives", "eczema", "allergy"
        ],
        "ENT": [
            "ear", "nose", "throat", "sinus", "tonsil", "sore throat"
        ],
        "Urology_Nephrology": [
            "kidney", "urine", "bladder", "uti", "renal"
        ],
        "Gynaecology": [
            "period", "menstrual", "bleeding", "spotting", "pain", "discharge",
            "infertility", "pregnancy", "menopause"
        ],
        "General_Medicine": [
            "fever", "flu", "fatigue", "cold", "weakness"
        ]
    }

    # Check in priority order (critical departments first)
    for department, keywords in hospital_map.items():
        if any(k in complaint for k in keywords):
            return department

    return "General_Medicine"


# ============================================================
# ------------------- REFERRAL SYSTEM ------------------------
# ============================================================

def get_referral(complaint_or_reason: str):

    dept_table = get_department(complaint_or_reason)
    print(f"[PARS] Determined Department: {dept_table}")

    supabase = get_supabase()
    doctors = []

    if supabase:
        try:
            response = supabase.table(dept_table.lower()).select("*").execute()
            data = response.data

            for doc in data:
                doctors.append({
                    "name": doc.get("doc_name"),
                    "experience": doc.get("experience_years"),
                    "available": doc.get("is_available")
                })

        except Exception as e:
            print(f"[PARS] Supabase Query Error: {e}")
            doctors = [{
                "name": "Dr. House (Mock)",
                "experience": 10,
                "available": True
            }]

    return {
        "department": dept_table,
        "doctors": doctors
    }
