"""
PARS - ML Service
Loads the Keras triage model and preprocessor, applies hybrid guardrails.
Place your trained model files in the same directory:
  - triage_model_nn.keras
  - preprocessor_nn.pkl
"""

import numpy as np
import pandas as pd
import joblib
import os

# Optimize TensorFlow memory usage for free-tier constraints (512MB RAM)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF logging
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0' # Disable OneDNN to save memory
# Limit the number of threads TF can use
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['TF_NUM_INTEROP_THREADS'] = '1'
os.environ['TF_NUM_INTRAOP_THREADS'] = '1'

class TriageModel:
    def __init__(self, model_path="triage_model_nn.keras", preprocessor_path="preprocessor_nn.pkl"):
        try:
            import tensorflow as tf
            
            # Configure TF to not allocate all memory
            tf.config.threading.set_inter_op_parallelism_threads(1)
            tf.config.threading.set_intra_op_parallelism_threads(1)
            
            # Force CPU usage only as GPUs often pre-allocate memory
            tf.config.set_visible_devices([], 'GPU')

            import zipfile
            import h5py
            # Use os.path.dirname to make paths relative to this script
            base_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Construct absolute paths
            model_full_path = os.path.join(base_dir, model_path)
            preprocessor_full_path = os.path.join(base_dir, preprocessor_path)

            # Reconstruct model architecture explicitly to avoid Keras 3 -> Keras 2 config incompatibilities
            self.model = tf.keras.Sequential([
                tf.keras.layers.Dense(64, activation='relu', input_shape=(19,), name='dense'),
                tf.keras.layers.Dropout(0.2, name='dropout'),
                tf.keras.layers.Dense(64, activation='tanh', name='dense_1'),
                tf.keras.layers.Dropout(0.3, name='dropout_1'),
                tf.keras.layers.Dense(64, activation='tanh', name='dense_2'),
                tf.keras.layers.Dropout(0.3, name='dropout_2'),
                tf.keras.layers.Dense(32, activation='relu', name='dense_3'),
                tf.keras.layers.Dropout(0.2, name='dropout_3'),
                tf.keras.layers.Dense(32, activation='relu', name='dense_4'),
                tf.keras.layers.Dropout(0.2, name='dropout_4'),
                tf.keras.layers.Dense(1, activation='sigmoid', name='dense_5')
            ])
            
            # Extract Keras 3 weights and load them manually via h5py
            h5_target = os.path.join(base_dir, 'model.weights.h5')
            if not os.path.exists(h5_target):
                with zipfile.ZipFile(model_full_path, 'r') as z:
                    z.extract('model.weights.h5', base_dir)
            
            with h5py.File(h5_target, 'r') as f:
                for layer in self.model.layers:
                    if layer.name in f['layers']:
                        var_group = f['layers'][layer.name].get('vars', {})
                        if var_group:
                            weights = [var_group[str(i)][:] for i in range(len(var_group.keys()))]
                            layer.set_weights(weights)

            self.preprocessor = joblib.load(preprocessor_full_path)
            print(f"[PARS] Model loaded from {model_full_path}. Input shape: {self.model.input_shape}")
        except Exception as e:
            print(f"[PARS] Error loading model/preprocessor: {e}")
            raise e

    def predict(self, data: dict) -> dict:
        """
        Takes patient vitals dict, returns { risk_score, risk_label, details }.
        Applies hybrid guardrails before neural network inference.
        """
        # --- Guardrails (Rule-based override) ---
        # Critical thresholds as per test.py logic
        hr = data.get("Heart_Rate", 80)
        systolic = data.get("Systolic_BP", 120)
        o2 = data.get("O2_Saturation", 98)
        gcs = data.get("GCS_Score", 15)

        critical_reasons = []
        
        # Test.py Logic:
        # Critical Tachycardia (>180 BPM)
        if hr > 180:
            critical_reasons.append("Critical Tachycardia (>180 BPM)")
        # Critical Bradycardia (<40 BPM)
        elif hr < 40:
            critical_reasons.append("Critical Bradycardia (<40 BPM)")
            
        # Severe Hypotension / Shock (<70 mmHg)
        if systolic < 70:
            critical_reasons.append("Severe Hypotension / Shock (<70 mmHg)")
            
        # Critical Hypoxia (<85%)
        if o2 < 85:
            critical_reasons.append("Critical Hypoxia (<85%)")
            
        # Unconscious / Coma (GCS <= 8)
        if gcs <= 8:
            critical_reasons.append("Unconscious / Coma (GCS <= 8)")

        if critical_reasons:
            return {
                "risk_score": 0.99,
                "risk_label": "HIGH",
                "details": "⚠️ Critical vitals detected (SAFETY OVERRIDE): " + ". ".join(critical_reasons) + ".",
            }

        # --- Neural Network Prediction ---
        df = pd.DataFrame([data])

        # Rename Temperature -> Temp if model expects it (Logic from test.py)
        # Rename Temperature -> Temp if model expects it (Logic from test.py)
        if "Temperature" in df.columns:
            df = df.rename(columns={"Temperature": "Temp"})

        # Rename History fields to match model training data
        rename_map = {
            "Diabetes": "History_Diabetes", 
            "Hypertension": "History_Hypertension", 
            "Heart_Disease": "History_Heart_Disease"
        }
        df = df.rename(columns=rename_map)

        # Add placeholder column if model was trained with it (Logic from test.py)
        if "Unnamed: 0" not in df.columns:
            df["Unnamed: 0"] = 0
            
        # Add BMI if missing (Default to average 25.0 since we don't have height/weight in input)
        if "BMI" not in df.columns:
            df["BMI"] = 25.0

        # Ensure boolean columns are int (using new names)
        for col in ["History_Diabetes", "History_Hypertension", "History_Heart_Disease"]:
            if col in df.columns:
                df[col] = df[col].astype(int)

        # Scale features
        # Ensure columns are in the correct order as expected by the preprocessor if necessary
        # The preprocessor (ColumnTransformer) usually handles columns by name, but let's be safe.
        
        try:
             X = self.preprocessor.transform(df)
        except Exception as e:
             # Debugging: Print columns if transform fails
             print(f"[PARS] Columns in DF: {df.columns.tolist()}")
             raise e

        # Predict
        prediction = self.model.predict(X, verbose=0)
        risk_score = float(prediction[0][0]) if prediction.shape[-1] == 1 else float(np.max(prediction[0]))

        # Classify
        # Classify based on new thresholds from test.py
        if risk_score >= 0.75:
            risk_label = "HIGH"
        elif risk_score >= 0.40:
            risk_label = "MEDIUM"
        else:
            risk_label = "LOW"

        # Generate explanation
        details = []
        if hr > 100:
            details.append("Elevated heart rate")
        if systolic < 90:
            details.append("Low blood pressure")
        if o2 < 94:
            details.append("Low oxygen saturation")
        gcs = data.get("GCS_Score", 15)
        if gcs <= 12:
            details.append("Reduced consciousness (GCS ≤ 12)")
        temp = data.get("Temperature", 37)
        if temp > 39:
            details.append("Fever detected")
        pain = data.get("Pain_Score", 0)
        if pain >= 7:
            details.append("Significant pain reported")
        if not details:
            details.append("Vitals within acceptable range")

        return {
            "risk_score": round(risk_score, 4),
            "risk_label": risk_label,
            "details": ". ".join(details) + ".",
        }
