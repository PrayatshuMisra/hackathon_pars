import traceback
import sys

try:
    from ml_service import TriageModel
    print("Testing ML Service model loading...")
    m = TriageModel()
    print("Model loaded successfully!")
except Exception as e:
    print("FAILED TO LOAD MODEL:")
    traceback.print_exc()
    sys.exit(1)
