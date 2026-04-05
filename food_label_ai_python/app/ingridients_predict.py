import re

import joblib
import os
import pytesseract
from rapidfuzz import fuzz

from app.ocr_utils import extract_text_candidates

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "ingridient_xgb_pipeline.pkl")

ENCODER_PATH =os.path.join(BASE_DIR, "models", "ingridient_label_encoder.pkl") 

pipeline = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)

BASE_SCORES = {
    "healthy": 85,
    "moderate": 60,
    "unhealthy": 30,
}

INGREDIENT_SCORES = {
    "hfcs": -15,
    "artificial_sweeteners": -12,
    "glucose_syrup": -10,
    "sugar": -10,
    "brown_sugar": -8,
    "dextrose": -8,
    "fructose": -8,
    "glucose": -8,
    "syrups": -10,
    "preservatives": -10,
    "colors": -8,
    "artificial": -10,
    "palm_oil": -8,
    "vegetable_oil": -5,
    "soy_oil": -5,
    "canola_oil": -4,
    "refined_flour": -10,
    "corn_flour": -6,
    "rice_flour": -5,
    "starch": -5,
    "thickeners": -4,
    "emulsifiers": -4,
    "stabilizers": -4,
    "raising_agents": -3,
    "acidity_regulator": -3,
    "salt": -4,
    "butter": -3,
    "cream": -4,
    "cheese": -4,
    "chocolate": -3,
    "whole_wheat": 4,
    "oats": 5,
    "oat_flour": 4,
    "fruits": 5,
    "seeds": 4,
    "nuts": 4,
    "peanuts": 3,
    "barley": 4,
    "rye": 4,
    "milk": 2,
    "eggs": 3,
    "corn": 2,
    "soy": 2,
    "rice": 1,
}

VOCAB = {
    "refined_flour": ["maida", "refined flour", "refined wheat flour", "bleached flour"],
    "starch": ["starch", "modified starch", "corn starch"],
    "emulsifiers": ["lecithin", "emulsifier", "mono glycerides", "diglycerides", "emulsifying salts"],
    "preservatives": ["preservative", "benzoate", "sorbate", "nitrite", "yeast extract"],
    "colors": ["colour", "color", "colouring", "caramel color", "artificial color", "permitted colour"],
    "raising_agents": ["raising agent", "raising agents", "leavening", "baking powder", "sodium bicarbonate"],
    "thickeners": ["thickener", "thickeners", "gum", "xanthan", "guar gum"],
    "acidity_regulator": ["acidity regulator", "citric acid", "acid regulator", "ins 330"],
    "whole_wheat": ["whole wheat", "wholemeal", "whole grain wheat"],
    "oats": ["oats", "rolled oats"],
    "oat_flour": ["oat flour"],
    "rice": ["rice"],
    "rice_flour": ["rice flour"],
    "corn": ["corn", "maize"],
    "corn_flour": ["corn flour", "cornmeal", "maize flour"],
    "barley": ["barley"],
    "rye": ["rye"],
    "sugar": ["sugar", "cane sugar"],
    "brown_sugar": ["brown sugar", "raw sugar"],
    "dextrose": ["dextrose"],
    "fructose": ["fructose"],
    "glucose": ["glucose"],
    "syrups": ["syrup", "invert syrup"],
    "glucose_syrup": ["glucose syrup", "corn syrup"],
    "hfcs": ["hfcs", "high fructose corn syrup"],
    "artificial_sweeteners": ["aspartame", "sucralose", "acesulfame", "saccharin"],
    "vegetable_oil": ["vegetable oil", "edible vegetable oil"],
    "palm_oil": ["palm oil", "palmolein", "palm kernel oil"],
    "canola_oil": ["canola oil", "rapeseed oil"],
    "soy_oil": ["soy oil", "soybean oil"],
    "butter": ["butter"],
    "cream": ["cream"],
    "cheese": ["cheese"],
    "milk": ["milk", "milk solids", "milk powder"],
    "eggs": ["egg", "eggs"],
    "chocolate": ["chocolate", "cocoa mass"],
    "salt": ["salt", "sea salt"],
    "nuts": ["nuts", "almond", "cashew", "hazelnut"],
    "peanuts": ["peanut", "peanuts"],
    "seeds": ["seed", "seeds", "flax", "chia", "sesame"],
    "fruits": ["fruit", "fruits", "banana", "apple", "berries", "raisin", "date"],
    "soy": ["soy", "soya"],
    "artificial": [
        "artificial",
        "synthetic",
        "nature identical flavouring substances",
        "nature identical flavour",
        "artificial flavour",
        "flavouring substances",
        "flavour enhancer",
    ],
}

COMMON_INGREDIENT_FIXES = {
    "ingredlents": "ingredients",
    "ingradients": "ingredients",
    "contalns": "contains",
    "vegetabie": "vegetable",
    "syrvp": "syrup",
    "frvctose": "fructose",
    "dextrosee": "dextrose",
    "oi1": "oil",
    "flavouring": "flavouring",
    "flavouf": "flavour",
    "oreganc": "oregano",
    "paimolein": "palmolein",
}


def extract_text(img_path):
    text = extract_text_candidates(img_path, mode="ingredients")
    for wrong, right in COMMON_INGREDIENT_FIXES.items():
        text = text.replace(wrong, right)
    return text


def extract_ingredient_section(text):
    patterns = [
        r"ingredients?\s*[:\-]\s*(.*?)(?:may contain|allergen information|allergy advice|nutrition facts|nutritional information|storage|manufacturer|marketed by|$)",
        r"ingredient list\s*[:\-]\s*(.*?)(?:may contain|allergen information|allergy advice|nutrition facts|nutritional information|storage|manufacturer|marketed by|$)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1)

    return text


def clean_text(text):
    text = extract_ingredient_section(text)
    text = text.replace("\n", " ")
    text = re.sub(r"may contain.*", "", text)
    text = re.sub(r"ingredients?[:\- ]*", "", text)
    text = re.sub(r"[^a-z ]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def correct_ocr_tokens(text):
    text = f" {text} "
    phrase_repairs = {
        " palm oilein ": " palmolein ",
        " palmolein ": " palmolein ",
        " soyabean ": " soybean ",
        " soybean oil ": " soybean oil ",
        " flavouring substancces ": " flavouring substances ",
        " flavouring substanees ": " flavouring substances ",
        " nature identical ": " nature identical ",
        " acidty regulator ": " acidity regulator ",
        " yeast extract ": " yeast extract ",
        " rice bran oil ": " rice bran oil ",
        " onion powder ": " onion powder ",
        " milk solids ": " milk solids ",
        " vegetable protein ": " vegetable protein ",
        " desiccated coconut ": " desiccated coconut ",
        " anti caking ": " anticaking ",
    }

    for wrong, right in phrase_repairs.items():
        text = text.replace(wrong, right)

    text = re.sub(r"ricebran ?oil", " rice bran oil ", text)
    text = re.sub(r"yeast ?extract", " yeast extract ", text)
    text = re.sub(r"onion ?powder", " onion powder ", text)
    text = re.sub(r"milk ?solids", " milk solids ", text)
    text = re.sub(r"vegetable ?protein", " vegetable protein ", text)
    text = re.sub(r"desiccated ?coconut", " desiccated coconut ", text)
    text = re.sub(r"anti ?caking", " anticaking ", text)
    text = re.sub(r"acidity ?regulator", " acidity regulator ", text)
    text = re.sub(r"\bins\s*(\d+)\b", r" ins \1 ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def build_ngrams(tokens, max_n=4):
    ngrams = []
    for size in range(1, max_n + 1):
        for index in range(len(tokens) - size + 1):
            ngrams.append(" ".join(tokens[index:index + size]))
    return ngrams


def unique_preserve_order(items):
    seen = set()
    ordered = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        ordered.append(item)
    return ordered


def vocab_mapping(text):
    detected = []
    tokens = text.split()
    phrases = build_ngrams(tokens, max_n=5)
    searchable_phrases = unique_preserve_order(phrases)
    token_set = set(tokens)

    for key, synonyms in VOCAB.items():
        for synonym in synonyms:
            synonym = synonym.lower()
            synonym_tokens = synonym.split()

            if len(synonym_tokens) == 1:
                exact_hit = synonym in token_set
            else:
                exact_hit = synonym in searchable_phrases

            fuzzy_hit = any(
                len(phrase.split()) == len(synonym_tokens)
                and (
                    fuzz.ratio(phrase, synonym) >= 95
                    or fuzz.token_sort_ratio(phrase, synonym) >= 95
                )
                for phrase in searchable_phrases
            )
            if exact_hit or fuzzy_hit:
                detected.append(key)
                break

    return " ".join(unique_preserve_order(detected))


def clamp_score(score):
    return max(0, min(100, int(round(score))))


def normalize_prediction_label(label):
    if not label:
        return None

    lower = str(label).strip().lower()
    if "healthy" in lower and "unhealthy" not in lower:
        return "healthy"
    if "unhealthy" in lower:
        return "unhealthy"
    if "moderate" in lower:
        return "moderate"
    return None


def calculate_ingredient_health_score(prediction_label, ingredients_detected):
    normalized_label = normalize_prediction_label(prediction_label)
    base_score = BASE_SCORES.get(normalized_label, 55)
    ingredient_breakdown = []
    strong_negative = []
    mild_negative = []
    positive_scores = []

    for ingredient in ingredients_detected:
        delta = INGREDIENT_SCORES.get(ingredient, 0)
        ingredient_breakdown.append(
            {
                "ingredient": ingredient,
                "score": delta,
            }
        )

        if delta <= -8:
            strong_negative.append(abs(delta))
        elif delta < 0:
            mild_negative.append(abs(delta))
        elif delta > 0:
            positive_scores.append(delta)

    strong_negative.sort(reverse=True)
    mild_negative.sort(reverse=True)
    positive_scores.sort(reverse=True)

    severe_penalty = 0.0
    for index, value in enumerate(strong_negative):
        severe_penalty += value * (1.0 if index < 2 else 0.6)

    mild_penalty = 0.0
    for index, value in enumerate(mild_negative):
        mild_penalty += value * (0.75 if index < 3 else 0.4)

    positive_bonus = 0.0
    for index, value in enumerate(positive_scores):
        positive_bonus += value * (1.0 if index < 3 else 0.55)

    balance_adjustment = 0.0
    if len(positive_scores) >= 3 and len(strong_negative) == 0:
        balance_adjustment += 4.0
    if len(positive_scores) >= 2 and len(mild_negative) <= 1:
        balance_adjustment += 2.0
    if len(strong_negative) >= 3:
        balance_adjustment -= 4.0
    if len(strong_negative) >= 1 and len(positive_scores) == 0:
        balance_adjustment -= 2.0

    raw_score = base_score - severe_penalty - mild_penalty + positive_bonus + balance_adjustment
    if normalized_label == "healthy":
        final_score = clamp_score(raw_score * 0.82 + base_score * 0.18)
    elif normalized_label == "unhealthy":
        final_score = clamp_score(raw_score * 0.82 + base_score * 0.18)
    elif normalized_label == "moderate":
        final_score = clamp_score(raw_score * 0.9 + base_score * 0.1)
    else:
        final_score = clamp_score(raw_score)
    return final_score, base_score, ingredient_breakdown


def predict_from_image_ingridients(img_path):
    raw_text = extract_text(img_path)
    cleaned = clean_text(raw_text)
    corrected = correct_ocr_tokens(cleaned)
    mapped = vocab_mapping(corrected)

    if not mapped:
        return {
            "success": False,
            "message": "Image not recognized properly",
            "ingredients_detected": [],
            "prediction": None,
        }

    pred = pipeline.predict([mapped])[0]
    label = label_encoder.inverse_transform([pred])[0]
    ingredients_detected = mapped.split()
    health_score, base_score, ingredient_breakdown = calculate_ingredient_health_score(
        label, ingredients_detected
    )

    return {
        "success": True,
        "message": "Prediction successful",
        "ingredients_detected": ingredients_detected,
        "prediction": label,
        "health_score": health_score,
        "base_score": base_score,
        "score_breakdown": ingredient_breakdown,
    }
