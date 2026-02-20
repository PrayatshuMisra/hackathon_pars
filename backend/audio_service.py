import os
import warnings

# Suppress warnings (like FP16 on CPU)
warnings.filterwarnings("ignore")

class AudioService:
    def __init__(self):
        print("[PARS] Loading Whisper model (this may take a moment)...")
        try:
            import whisper
            # "tiny" consumes ~150MB of RAM vs "base" which consumes ~500MB
            self.model = whisper.load_model("tiny")
            print("[PARS] Whisper 'tiny' model loaded successfully.")
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
