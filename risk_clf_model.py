import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.compose import ColumnTransformer
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# 1. Load the Data
file_path = r"D:\codes\Datasets\patients_data_new.csv"
try:
    df = pd.read_csv(file_path)
    print("Dataset loaded successfully.")
except FileNotFoundError:
    print(f"Error: The file at {file_path} was not found.")
    exit()

# 2. Feature Engineering: Create Risk_Level
def categorize_risk(score):
    if score < 0.4:
        return "Low"
    elif score < 0.75:
        return "Medium"
    else:
        return "High"

# Ensure Risk_Level exists
if 'Risk_Level' not in df.columns:
    df['Risk_Level'] = df['Risk_Score'].apply(categorize_risk)

# 3. Define Features (X) and Target (y)
X = df.drop(columns=['Risk_Level', 'Risk_Score', 'Patient_ID', 'Chief_Complaint'])
y = df['Risk_Level']

# 4. CRITICAL: Encode Target Labels for XGBoost
# XGBoost expects integers (0, 1, 2), not strings.
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Print mapping so you know which number is which class
class_mapping = dict(zip(le.classes_, le.transform(le.classes_)))
print(f"Target Mapping: {class_mapping}")

# 5. Preprocessing Pipeline for Features
categorical_cols = ['Gender', 'Arrival_Mode']
numerical_cols = [col for col in X.columns if col not in categorical_cols]

preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_cols),
        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_cols)
    ])

# 6. Split the Data
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)

# 7. Apply Feature Scaling/Encoding
X_train_scaled = preprocessor.fit_transform(X_train)
X_test_scaled = preprocessor.transform(X_test)

# 8. Train XGBoost Classifier
print("Training XGBoost Model...")
xgb_model = XGBClassifier(
    n_estimators=100,      # Number of boosting rounds
    learning_rate=0.1,     # Step size shrinkage
    max_depth=5,           # Maximum depth of a tree
    eval_metric='mlogloss', # Multi-class log loss
    use_label_encoder=False, # Avoid warning in newer versions
    random_state=42
)

xgb_model.fit(X_train_scaled, y_train)

# 9. Evaluate the Model
y_pred_encoded = xgb_model.predict(X_test_scaled)

# Convert integer predictions back to original string labels for readability
y_test_labels = le.inverse_transform(y_test)
y_pred_labels = le.inverse_transform(y_pred_encoded)

accuracy = accuracy_score(y_test_labels, y_pred_labels)
print("-" * 30)
print(f"XGBoost Model Accuracy: {accuracy * 100:.2f}%")
print("-" * 30)

print("\nClassification Report:")
print(classification_report(y_test_labels, y_pred_labels))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test_labels, y_pred_labels))