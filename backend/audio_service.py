import whisper
import os
import warnings

# Suppress warnings (like FP16 on CPU)
warnings.filterwarnings("ignore")

class AudioService:
    def __init__(self):
        print("[PARS] Loading Whisper model (this may take a moment)...")
        try:
            # "base" is a good balance of speed vs accuracy for English
            # Use "small" if accuracy is poor, "tiny" if too slow
            self.model = whisper.load_model("base")
            print("[PARS] Whisper model loaded successfully.")
        except Exception as e:
            print(f"[PARS] CRITICAL: Failed to load Whisper model: {e}")
            self.model = None

    def transcribe(self, file_path: str) -> str:
        if not self.model:
            return "Error: Document processing unavailable (Model not loaded)."
        
        try:
            # fp16=False is safer for CPU inference
            result = self.model.transcribe(file_path, fp16=False)
            text = result.get("text", "").strip()
            return text
        except Exception as e:
            print(f"[PARS] Transcription error: {e}")
            return ""
