import shutil
import whisper
import warnings

warnings.filterwarnings("ignore")

def check_ffmpeg():
    if shutil.which("ffmpeg"):
        print("[SUCCESS] ffmpeg is installed and in PATH.")
        return True
    else:
        print("[ERROR] ffmpeg is NOT found in PATH.")
        print("Whisper requires ffmpeg to process audio.")
        print("Please install ffmpeg (e.g. `winget install ffmpeg` or download from ffmpeg.org and add to PATH).")
        return False

def check_whisper():
    print("Loading Whisper model...")
    try:
        model = whisper.load_model("tiny")
        print("[SUCCESS] Whisper model loaded.")
    except Exception as e:
        print(f"[ERROR] Whisper load failed: {e}")

if __name__ == "__main__":
    if check_ffmpeg():
        check_whisper()
