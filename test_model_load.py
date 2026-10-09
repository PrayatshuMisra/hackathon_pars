"""Test script to debug model loading"""
import sys
sys.path.append('backend')

try:
    from ml_service import TriageModel  # type: ignore
    print("Attempting to load model...")
    model = TriageModel()
    print("[OK] Model loaded successfully!")
    print(f"Model input shape: {model.model.input_shape}")
except Exception as e:
    print(f"[ERROR] Model loading failed!")
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
