import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.metrics import accuracy_score

# 1. Load the Data
file_path = r"D:\codes\Datasets\patients_data_new.csv"
try:
    df = pd.read_csv(file_path)
    print("Dataset loaded successfully.")
except FileNotFoundError:
    print(f"Error: The file at {file_path} was not found. Please check the path.")
    exit()

# 2. Preprocessing
# Drop non-predictive columns. 
# 'Chief_Complaint' is text data; for a standard ML model, we drop it unless using NLP.
# 'Patient_ID' is an identifier and carries no predictive value.
X = df.drop(columns=['Risk_Score', 'Patient_ID', 'Chief_Complaint', 'Risk_Level'])
y = df['Risk_Level']

# Identify Categorical and Numerical columns
categorical_cols = ['Gender', 'Arrival_Mode']
numerical_cols = [col for col in X.columns if col not in categorical_cols]

# 3. Define the Preprocessing Pipeline (Scaling + Encoding)
# We use ColumnTransformer to apply different transformations to different column types
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_cols), # Scale numeric data
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_cols) # Encode categorical data
    ])

# 4. Split the Data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 5. Apply Transformations
# Fit on training data, transform both training and test data
X_train_scaled = preprocessor.fit_transform(X_train)
X_test_scaled = preprocessor.transform(X_test)

# 6. Train the Model (Random Forest Regressor)
print("Training the model...")
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)

# 7. Evaluate the Model
y_pred = model.predict(X_test_scaled)

mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("-" * 30)
print(f"Model Evaluation Metrics:")
print(f"Mean Squared Error (MSE): {mse:.4f}")
print(f"R² Score: {r2:.4f}")
print("-" * 30)

# Optional: Show a few predictions vs actuals
comparison_df = pd.DataFrame({'Actual Risk': y_test, 'Predicted Risk': y_pred})
print("\nFirst 5 Predictions vs Actuals:")
print(comparison_df.head())

# 1. Make Predictions
y_pred_scores = model.predict(X_test_scaled)

# 2. Define the Logic to Convert Score -> Category
def get_risk_category(score):
    if score < 0.4:
        return "Low"
    elif score < 0.75:
        return "Medium"
    else:
        return "High"

# 3. Convert Actuals and Predictions to Categories
# We use a list comprehension to apply the logic to every value
y_test_labels = [get_risk_category(score) for score in y_test]
y_pred_labels = [get_risk_category(score) for score in y_pred_scores]

# 4. Calculate Accuracy
accuracy = accuracy_score(y_test_labels, y_pred_labels)

print(f"Model Accuracy (based on Risk Categories): {accuracy * 100:.2f}%")