from sentence_transformers import SentenceTransformer, util

import torch
 
# Load a compact, high-performance model (approx 80MB)

# 'all-MiniLM-L6-v2' is perfect for real-time classification

model = SentenceTransformer('all-MiniLM-L6-v2')
 
# Define your departments with slightly descriptive keys to help the NLP "understand"

DEPARTMENTS = [

    "Cardiology (Heart and Blood Pressure)",

    "Neurology (Brain and Nerves)",

    "Gastroenterology (Stomach and Digestion)",

    "Pulmonology (Lungs and Breathing)",

    "Orthopedics (Bones and Joints)",

    "Emergency Trauma (Severe Injuries)",

    "General Medicine (Fever and Flu)",

    "Dermatology (Skin and Rashes)",

    "ENT (Ear, Nose, and Throat)",

    "Urology (Kidney and Bladder)",

    "Psychiatry (Mental Health)",

    "Toxicology (Poisoning)"

]
 
# Pre-calculate embeddings for departments once to save compute

DEPT_EMBEDDINGS = model.encode(DEPARTMENTS, convert_to_tensor=True)
 
def get_department_nlp(complaint: str) -> str:

    if not complaint or len(complaint.strip()) < 3:

        return "General_Medicine"
 
    # 1. Encode the user's complaint into a vector

    complaint_embedding = model.encode(complaint, convert_to_tensor=True)
 
    # 2. Compute Cosine Similarity against all departments

    # 

    cos_scores = util.cos_sim(complaint_embedding, DEPT_EMBEDDINGS)[0]
 
    # 3. Find the index of the highest score

    best_match_idx = int(torch.argmax(cos_scores))

    # Extract the clean name (the part before the parenthesis)

    full_dept_name = DEPARTMENTS[best_match_idx]

    clean_name = full_dept_name.split(" (")[0].replace(" ", "_")
 
    return clean_name
 
# Example Usage:

complaint = "I am having a lot of trouble catching my breath and my chest feels heavy"

print(get_department_nlp(complaint)) 

# Output: Pulmonology
