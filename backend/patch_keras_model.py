import os
import zipfile
import json
import shutil

model_path = 'triage_model_nn.keras'
patched_path = 'triage_model_nn_patched.keras'

temp_dir = 'keras_extract_temp'
os.makedirs(temp_dir, exist_ok=True)

# Extract existing model
with zipfile.ZipFile(model_path, 'r') as zip_ref:
    zip_ref.extractall(temp_dir)

config_path = os.path.join(temp_dir, 'config.json')

with open(config_path, 'r', encoding='utf-8') as f:
    config_data = json.load(f)

# The config_data is either a dict representing the model or has nested config
def remove_quantization_config(obj):
    if isinstance(obj, dict):
        if 'quantization_config' in obj:
            print("Removed quantization_config!")
            del obj['quantization_config']
        for k, v in obj.items():
            remove_quantization_config(v)
    elif isinstance(obj, list):
        for item in obj:
            remove_quantization_config(item)

remove_quantization_config(config_data)

with open(config_path, 'w', encoding='utf-8') as f:
    json.dump(config_data, f, indent=4)

# Re-zip into patched file
with zipfile.ZipFile(patched_path, 'w', zipfile.ZIP_DEFLATED) as zip_ref:
    for root, dirs, files in os.walk(temp_dir):
        for file in files:
            file_path = os.path.join(root, file)
            # Arcname relative to temp_dir
            arcname = os.path.relpath(file_path, temp_dir)
            zip_ref.write(file_path, arcname)

print(f"Patched model saved to {patched_path}")
shutil.rmtree(temp_dir)

# Backup and replace
shutil.move(model_path, model_path + '.backup')
shutil.move(patched_path, model_path)
print("Replaced original model with patched version.")
