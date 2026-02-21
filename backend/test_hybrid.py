import os
from dept_service import get_department, init_nlp_models

print("Loading NLP models...")
init_nlp_models()
print("Models loaded.")

test_phrase = "I have bone pain and arthritis"
dept = get_department(test_phrase)
print(f"\nResult for '{test_phrase}': {dept}")
