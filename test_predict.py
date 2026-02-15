"""Test the /predict endpoint with snake bite"""
import requests
import json

url = "http://localhost:8000/predict"
payload = {
    "Age": 30,
    "Gender": "Male",
    "Chief_Complaint": "snake bite",
    "Heart_Rate": 75,
    "Systolic_BP": 120,
    "Diastolic_BP": 80,
    "O2_Saturation": 98,
    "Temperature": 37.0,
    "Respiratory_Rate": 16,
    "Pain_Score": 0,
    "GCS_Score": 15,
    "Arrival_Mode": "Walk-in",
    "Diabetes": False,
    "Hypertension": False,
    "Heart_Disease": False
}

print("Testing /predict endpoint with 'snake bite'...")
print(f"Sending request to {url}")

try:
    response = requests.post(url, json=payload)
    print(f"\nStatus Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("\n✓ SUCCESS! API is working!")
        print(f"\nRisk Assessment:")
        print(f"  - Risk Score: {data.get('risk_score')}")
        print(f"  - Risk Label: {data.get('risk_label')}")
        print(f"  - Details: {data.get('details')}")
        
        if 'referral' in data:
            print(f"\nDepartment Recommendation:")
            print(f"  - Department: {data['referral'].get('department')}")
            print(f"  - Doctors Found: {len(data['referral'].get('doctors', []))}")
            
            if data['referral'].get('department') == "Toxicology":
                print("\n✓✓✓ PERFECT! 'snake bite' correctly routed to Toxicology!")
            else:
                print(f"\n✗ ERROR: 'snake bite' routed to {data['referral'].get('department')} instead of Toxicology")
    else:
        print(f"\n✗ ERROR: {response.text}")
except Exception as e:
    print(f"\n✗ Connection Error: {e}")
