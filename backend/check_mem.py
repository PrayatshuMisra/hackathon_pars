import os, time, threading
import psutil

def print_mem():
    process = psutil.Process(os.getpid())
    while True:
        print(f"Memory: {process.memory_info().rss / 1024 / 1024:.2f} MB")
        time.sleep(1)

t = threading.Thread(target=print_mem, daemon=True)
t.start()

print("Importing TriageModel...")
from ml_service import TriageModel
print("Initializing model...")
model = TriageModel()
print("Model initialized.")
