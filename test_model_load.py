"""Test script to debug model loading"""
import sys
sys.path.append('backend')

try:
    from ml_service import TriageModel
    print("Attempting to load model...")
    model = TriageModel()
    print("✓ Model loaded successfully!")
    print(f"Model input shape: {model.model.input_shape}")
except Exception as e:
    print(f"✗ Model loading failed!")
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
