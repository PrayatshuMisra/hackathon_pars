import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.metrics import r2_score, mean_absolute_error
import tensorflow as tf
from tensorflow.keras import models, layers, callbacks
import joblib

# 1. Load Data
file_path = "patients_data.csv"
try:
    df = pd.read_csv(file_path)
    print("Dataset loaded successfully.")
except FileNotFoundError:
    print(f"Error: The file at {file_path} was not found.")
    exit()

# 2. Define Features (X) and Target (y)
# TARGET CHANGE: We are now predicting 'Risk_Score' directly.
X = df.drop(columns=['Risk_Level', 'Risk_Score', 'Patient_ID', 'Chief_Complaint'])
y = df['Risk_Score']  # This is a float, so no encoding needed.

# 3. Preprocessing (Encoding & Scaling Features)
categorical_cols = ['Gender', 'Arrival_Mode']
numerical_cols = [col for col in X.columns if col not in categorical_cols]

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_cols),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_cols)
    ])

# Split Data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Apply Feature Scaling
X_train_scaled = preprocessor.fit_transform(X_train)
X_test_scaled = preprocessor.transform(X_test)

# **Fix for Sparse Matrices**: Ensure data is dense for TensorFlow
# if hasattr(X_train_scaled, "toarray"):
#     X_train_scaled = X_train_scaled.toarray()
#     X_test_scaled = X_test_scaled.toarray()

# ==============================================================================
# 4. BUILD THE REGRESSION MODEL
# ==============================================================================

model = models.Sequential()

# --- Input Layer ---
model.add(layers.Dense(64, activation='relu', input_dim=X_train_scaled.shape[1]))
# --- Hidden Layers with Dropout ---
model.add(layers.Dropout(0.2)) # Randomly drop 20% of neurons to prevent overfitting
model.add(layers.Dense(64, activation='tanh'))
model.add(layers.Dropout(0.3))
model.add(layers.Dense(64, activation='tanh'))
model.add(layers.Dropout(0.3)) # Randomly drop 20% of neurons to prevent overfitting
model.add(layers.Dense(32, activation='relu'))
model.add(layers.Dropout(0.2))
model.add(layers.Dense(32, activation='relu'))
model.add(layers.Dropout(0.2))

# --- OUTPUT LAYER (CRITICAL CHANGE) ---
# Units = 1: Because we are predicting a single number.
# Activation = 'sigmoid': Because your Risk_Score is bound between 0 and 1.
# (If your target was Price or Age, you would use 'linear').
model.add(layers.Dense(1, activation='sigmoid'))

# ==============================================================================
# 5. COMPILE
# ==============================================================================

model.compile(
    optimizer='adam',
    loss='mean_squared_error',  # Standard loss for regression
    metrics=['mae']             # Mean Squared Error 
)

# ==============================================================================
# 6. TRAIN
# ==============================================================================

early_stopping = callbacks.EarlyStopping(
    monitor='val_loss',
    patience=10,        # Wait 10 epochs before stopping if no improvement
    restore_best_weights=True
)

print("\nStarting Training...")
history = model.fit(
    X_train_scaled, y_train,
    epochs=100,
    batch_size =16,
    validation_split=0.05,
    callbacks=[early_stopping],
    verbose=1
)

# ==============================================================================
# 7. EVALUATE
# ==============================================================================

# Make predictions
y_pred = model.predict(X_test_scaled)

# Calculate Metrics
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("-" * 40)
print(f"Model Evaluation (Regression):")
print(f"Mean Absolute Error (MAE): {mae:.4f}")
print(f"R² Score (Accuracy equivalent): {r2:.4f}")
print("-" * 40)

# Example Prediction
print("\n--- Example Prediction ---")
actual_val = y_test.iloc[0]
predicted_val = y_pred[0][0]

print(f"Actual Risk Score:    {actual_val:.4f}")
print(f"Predicted Risk Score: {predicted_val:.4f}")
print(f"Difference:           {abs(actual_val - predicted_val):.4f}")

model.save('triage_model_nn.keras') 
print("\n✅ Keras Model saved as 'triage_model_nn.keras'")

# B. Save the Preprocessor (MUST do this to scale new data later)
joblib.dump(preprocessor, 'preprocessor_nn.pkl')
print("✅ Preprocessor saved as 'preprocessor_nn.pkl'")