"""Test script to diagnose NLP department recommendation issues"""
from dept_service import get_department, get_referral

# Test cases
test_cases = [
    "chest pain and difficulty breathing",
    "severe headache and dizziness",
    "stomach pain and vomiting",
    "broken arm from accident",
    "snake bite",
    "high fever and weakness"
]

print("=" * 60)
print("TESTING NLP DEPARTMENT RECOMMENDATIONS")
print("=" * 60)

for complaint in test_cases:
    print(f"\nComplaint: '{complaint}'")
    dept = get_department(complaint)
    print(f"  → Department: {dept}")
    
    referral = get_referral(complaint)
    print(f"  → Referral Dept: {referral['department']}")
    print(f"  → Doctors: {len(referral['doctors'])} found")
    if referral['doctors']:
        for doc in referral['doctors'][:2]:  # Show first 2
            print(f"      - {doc['name']}")
