import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, precision_score, recall_score
from sklearn.model_selection import train_test_split
import joblib

# load data
DATA_PATH = ""
nutrition_df = pd.read_csv(DATA_PATH)

# drop unused columns
nutrition_df.drop(columns=["sr", "product_name"], inplace=True)

# remove invalid labels FIRST
invalid_labels = ["not-applicable", "unknown"]
nutrition_df = nutrition_df[
    ~nutrition_df["nutriscore_grade"].isin(invalid_labels)
]

# ===== NEW LABEL MAPPING =====
label_map = {
    "a": "Healthy",
    "b": "Healthy",
    "c": "moderate",
    "d": "unhealthy",
    "e": "unhealthy"
}

nutrition_df["nutriscore_grade"] = nutrition_df["nutriscore_grade"].map(label_map)

# verify labels
print(nutrition_df["nutriscore_grade"].value_counts())

# split features & target AFTER cleaning
X = nutrition_df.drop(columns=["nutriscore_grade"])
y = nutrition_df["nutriscore_grade"]

print(X.shape)
print(y.shape)

# encode labels
le = LabelEncoder()
y = le.fit_transform(y)

# train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# class weights (now 3 classes)
class_weights = {
    0: 1.0,
    1: 1.5,
    2: 1.0
}

# random forest model
model = RandomForestClassifier(
    n_estimators=300,
    max_depth=None,
    min_samples_leaf=5,
    class_weight=class_weights,
    random_state=42
)

model.fit(X_train, y_train)

# prediction
y_pred = model.predict(X_test)

# metrics
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, average="weighted")
recall = recall_score(y_test, y_pred, average="weighted")

print("Accuracy:", accuracy)
print("Precision:", precision)
print("Recall:", recall)

print(classification_report(y_test, y_pred, target_names=le.classes_))

# save random forest model
joblib.dump(model, "food_label_ai_python\\nutrition_rf_model.pkl")

# save label encoder
joblib.dump(le, "food_label_ai_python\\nutrition_label_encoder.pkl")

# save feature column order
joblib.dump(X.columns.tolist(), "food_label_ai_python\\nutrition_feature_columns.pkl")

print("Model, LabelEncoder, and feature columns saved successfully")
