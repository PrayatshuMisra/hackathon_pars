import sys
sys.path.insert(0, '.')
from dept_service import get_department_legacy

tests = [
    "I have severe chest pain and my heart is racing",
    "I had a stroke and my left side is numb",
    "I am having trouble breathing and wheezing",
    "I broke my leg in an accident",
    "I have severe stomach pain and vomiting",
    "I was bitten by a snake",
    "I feel depressed and anxious",
    "I have a skin rash and itching",
    "I have a kidney stone and severe back pain",
    "I have ear pain and sore throat",
    "I have a high fever and cold",
    "I was in a car accident and I am bleeding heavily",
    "I have irregular periods and pelvic pain",
    "I have a urinary tract infection",
    "I feel dizzy and have a migraine",
    "My blood pressure is very high",
    "I have kidney stones",
]

print("\n=== Department Keyword Matching Test ===\n")
for t in tests:
    dept = get_department_legacy(t)
    label = t if len(t) <= 55 else t[:55] + "..."
    print(f'  Input : "{label}"')
    print(f'  Result: {dept}')
    print()
