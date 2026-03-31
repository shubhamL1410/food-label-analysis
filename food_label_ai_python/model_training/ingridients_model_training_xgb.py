import pandas as pd
import numpy as np
import re

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    classification_report,
    accuracy_score,
    precision_score,
    recall_score,
    confusion_matrix
)
from sklearn.utils.class_weight import compute_sample_weight

from xgboost import XGBClassifier


# ==============================
# 1. LOAD DATA
# ==============================
DATA_PATH = ""
df = pd.read_csv(DATA_PATH)

df = df[
    df["ingredients_text_cleaned"].notna() &
    df["nutrition_grade_fr"].isin(["a", "b", "c", "d", "e"])
].copy()

print("Dataset size:", df.shape)


# ==============================
# 2. LABEL MAPPING (3 CLASS)
# ==============================

def map_to_3class(label):
    label = label.lower()
    if label in ["a", "b"]:
        return "Healthy"
    elif label == "c":
        return "Moderate"
    return "Unhealthy"

df["target"] = df["nutrition_grade_fr"].apply(map_to_3class)

print("\nClass distribution:")
print(df["target"].value_counts())


# ==============================
# 3. TEXT CLEANING
# ==============================

def clean_ingredients(text):
    text = text.lower()

    # remove percentage signs but keep numbers
    text = re.sub(r"\d+%", " ", text)

    # keep letters, numbers, underscore
    text = re.sub(r"[^a-z0-9_ ]", " ", text)

    # normalize common ingredient groups
    text = text.replace("vegetable oil", "oil")
    text = text.replace("sodium chloride", "salt")
    text = text.replace("added sugar", "sugar")

    text = re.sub(r"\s+", " ", text)
    return text.strip()

df["clean_ingredients"] = df["ingredients_text_cleaned"].apply(clean_ingredients)


X = df["clean_ingredients"]
y = df["target"]


# ==============================
# 4. LABEL ENCODING
# ==============================

label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

print("\nLabel mapping:")
for i, cls in enumerate(label_encoder.classes_):
    print(i, ":", cls)


# ==============================
# 5. TRAIN TEST SPLIT
# ==============================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y_encoded,
    test_size=0.15,
    stratify=y_encoded,
    random_state=42
)


# ==============================
# 6. AUTOMATIC CLASS WEIGHTS
# ==============================

sample_weights = compute_sample_weight(
    class_weight="balanced",
    y=y_train
)


# ==============================
# 7. FEATURE EXTRACTION
# ==============================

word_vec = TfidfVectorizer(
    analyzer="word",
    ngram_range=(1, 3),
    min_df=3,
    max_df=0.95,
    max_features=40000,
    sublinear_tf=True
)

char_vec = TfidfVectorizer(
    analyzer="char_wb",
    ngram_range=(3, 6),
    min_df=3,
    max_features=30000,
    sublinear_tf=True
)


# ==============================
# 8. XGBOOST MODEL
# ==============================

model = XGBClassifier(
    objective="multi:softprob",
    num_class=3,
    eval_metric="mlogloss",

    n_estimators=400,
    learning_rate=0.03,
    max_depth=6,

    subsample=0.85,
    colsample_bytree=0.85,

    gamma=0.5,
    min_child_weight=5,

    reg_alpha=0.8,
    reg_lambda=2.0,

    tree_method="hist",
    random_state=42,
    n_jobs=-1
)


# 9. FULL PIPELINE

pipeline = Pipeline([
    ("features", FeatureUnion([
        ("word", word_vec),
        ("char", char_vec)
    ])),
    ("model", model)
])


print("\nTraining model...")
pipeline.fit(
    X_train,
    y_train,
    model__sample_weight=sample_weights
)


# ==============================
# 10. EVALUATION
# ==============================

y_pred = pipeline.predict(X_test)

print("\n=== CLASSIFICATION REPORT ===")
print(classification_report(
    y_test,
    y_pred,
    target_names=label_encoder.classes_
))

print("Accuracy :", accuracy_score(y_test, y_pred))
print("Precision:", precision_score(y_test, y_pred, average="macro"))
print("Recall   :", recall_score(y_test, y_pred, average="macro"))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

import joblib
joblib.dump(pipeline, "food_label_ai_python\\ingridient_xgb_pipeline.pkl")
joblib.dump(label_encoder, "food_label_ai_python\\ingridient_label_encoder.pkl")

print("\nModel saved successfully!")