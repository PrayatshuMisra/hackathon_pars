"""Comprehensive test script for NLP department recommendations"""
from dept_service import get_department, get_referral

# Comprehensive test cases covering all departments
test_cases = [
    # Toxicology - Critical cases
    ("snake bite", "Toxicology"),
    ("scorpion sting", "Toxicology"),
    ("drug overdose", "Toxicology"),
    ("accidentally drank poison", "Toxicology"),
    ("chemical exposure at work", "Toxicology"),
    
    # Emergency Trauma
    ("car accident with severe bleeding", "Emergency_Trauma"),
    ("fell from height", "Emergency_Trauma"),
    ("gunshot wound", "Emergency_Trauma"),
    
    # Cardiology
    ("chest pain and difficulty breathing", "Cardiology"),
    ("heart attack symptoms", "Cardiology"),
    ("high blood pressure", "Cardiology"),
    
    # Neurology
    ("severe headache and dizziness", "Neurology"),
    ("stroke symptoms", "Neurology"),
    ("seizure", "Neurology"),
    
    # Gastroenterology
    ("stomach pain and vomiting", "Gastroenterology"),
    ("severe abdominal pain", "Gastroenterology"),
    
    # Pulmonology
    ("difficulty breathing and cough", "Pulmonology"),
    ("asthma attack", "Pulmonology"),
    
    # Orthopedics
    ("broken arm", "Orthopedics"),
    ("sprained ankle", "Orthopedics"),
    
    # Psychiatry
    ("suicidal thoughts", "Psychiatry"),
    ("severe depression", "Psychiatry"),
    
    # General Medicine
    ("high fever and weakness", "General_Medicine"),
    ("flu symptoms", "General_Medicine"),
]

print("=" * 70)
print("COMPREHENSIVE NLP DEPARTMENT RECOMMENDATION TEST")
print("=" * 70)

passed = 0
failed = 0
results = []

for complaint, expected_dept in test_cases:
    actual_dept = get_department(complaint)
    status = "✓ PASS" if actual_dept == expected_dept else "✗ FAIL"
    
    if actual_dept == expected_dept:
        passed += 1
    else:
        failed += 1
    
    results.append({
        "complaint": complaint,
        "expected": expected_dept,
        "actual": actual_dept,
        "status": status
    })
    
    print(f"\n{status} | '{complaint}'")
    print(f"     Expected: {expected_dept}")
    print(f"     Got: {actual_dept}")

print("\n" + "=" * 70)
print(f"SUMMARY: {passed}/{len(test_cases)} tests passed ({failed} failed)")
print(f"Accuracy: {(passed/len(test_cases)*100):.1f}%")
print("=" * 70)

# Show failures if any
if failed > 0:
    print("\nFAILED TESTS:")
    for r in results:
        if r["status"] == "✗ FAIL":
            print(f"  - '{r['complaint']}': Expected {r['expected']}, Got {r['actual']}")
