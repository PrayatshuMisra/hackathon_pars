
import os
import tensorflow as tf
from ml_service import TriageModel

try:
    model = TriageModel()
    print("SUCCESS: Model loaded correctly.")
except Exception as e:
    print(f"FAILURE: {e}")
