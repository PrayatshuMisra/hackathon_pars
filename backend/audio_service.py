import os
import warnings

warnings.filterwarnings("ignore")

class AudioService:
    def __init__(self):
        self.model = None
        print("[PARS] Audio/Whisper service disabled (not installed).")

    def transcribe(self, file_path: str) -> str:
        return "Error: Speech transcription is unavailable in this deployment."
