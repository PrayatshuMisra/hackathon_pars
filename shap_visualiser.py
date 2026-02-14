import shap
import pandas as pd
import numpy as np
import tensorflow as tf
import joblib
import matplotlib.pyplot as plt

# ==========================================
# 1. CONFIGURATION (Update paths if needed)
# ==========================================
MODEL_PATH = r"D:\codes\hackathon_chennai\triage_model_nn.keras"
PREPROCESSOR_PATH = r"D:\codes\hackathon_chennai\preprocessor_nn.pkl"
DATA_PATH = r"D:\codes\Datasets\patients_data_final_v3.csv"

print("--- Loading Artifacts ---")

# Load the trained model
try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("✅ Model loaded.")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    exit()

# Load the preprocessor
try:
    preprocessor = joblib.load(PREPROCESSOR_PATH)
    print("✅ Preprocessor loaded.")
except Exception as e:
    print(f"❌ Error loading preprocessor: {e}")
    exit()

# ==========================================
# 2. PREPARE DATA
# ==========================================
print("--- Preparing Data for SHAP ---")

# Load dataset
df = pd.read_csv(DATA_PATH)

# Drop targets/IDs to match Training Data X
X = df.drop(columns=['Risk_Level', 'Risk_Score', 'Patient_ID', 'Chief_Complaint'], errors='ignore')

# We need two sets of data:
# A. Background Data: A summary of "average" patients (SHAP needs this for comparison)
# B. Test Patient: The specific patient we want to explain
X_background_raw = X.sample(2000, random_state=42)  # Take 50 random patients
X_test_raw = X.iloc[0:1]  # Take the VERY FIRST patient in the file (Row 0)

# Preprocess BOTH (Scale/Encode them)
# SHAP works on the numbers the model sees, so we must preprocess first.
X_background_processed = preprocessor.transform(X_background_raw)
X_test_processed = preprocessor.transform(X_test_raw)

# Fix for Sparse Matrices (if OneHotEncoder created a sparse matrix)
if hasattr(X_background_processed, "toarray"):
    X_background_processed = X_background_processed.toarray()
    X_test_processed = X_test_processed.toarray()

# ==========================================
# 3. GET FEATURE NAMES
# ==========================================
# Because OneHotEncoder splits "Gender" into "Gender_Male" and "Gender_Female",
# we need to get the new list of feature names to make the chart readable.
try:
    feature_names = preprocessor.get_feature_names_out()
except:
    # Fallback if scikit-learn version is old
    feature_names = [f"Feature {i}" for i in range(X_background_processed.shape[1])]

print(f"✅ Features identified: {len(feature_names)}")

# ==========================================
# 4. RUN SHAP (The Magic)
# ==========================================
print("--- Calculating SHAP Values (This might take a moment) ---")

# A. Initialize the Explainer
# We pass the MODEL'S PREDICT FUNCTION and the BACKGROUND DATA
explainer = shap.KernelExplainer(model.predict, X_background_processed)

# B. Calculate SHAP values for the specific test patient
shap_values = explainer.shap_values(X_test_processed)

# Handle list output (common in Keras/TensorFlow)
if isinstance(shap_values, list):
    shap_values = shap_values[0]

# ==========================================
# 5. VISUALIZE (FIXED)
# ==========================================
print("--- Generating Plot ---")

# 1. FIX THE SHAPE: Flatten arrays to be simple 1D lists
# The error happens because vals is (19, 1) instead of (19,)
vals = shap_values[0] 
if hasattr(vals, 'flatten'):
    vals = vals.flatten() # Forces it to be [0.1, 0.2, ...]

# 2. FIX BASE VALUE: Ensure it's a single number, not an array
base_val = explainer.expected_value
if hasattr(base_val, '__iter__'): # If it's a list/array
    base_val = base_val[0]

# 3. FIX DATA: Ensure data is 1D
data_val = X_test_processed[0]
if hasattr(data_val, 'flatten'):
    data_val = data_val.flatten()

# 4. PLOT
plt.figure()
shap.plots.waterfall(
    shap.Explanation(
        values=vals, 
        base_values=base_val, 
        data=data_val, 
        feature_names=feature_names
    ),
    show=False
)

plt.title("Why did the AI predict this Risk Score?", fontsize=14)
plt.tight_layout()
plt.show()

print("✅ Done! Check the popup window.")