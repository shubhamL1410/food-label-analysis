import re

import joblib
import pandas as pd
import pytesseract
from rapidfuzz import fuzz

from app.ocr_utils import extract_nutrition_ocr_payload, extract_nutrition_table_texts, extract_text_candidates

# =========================
# TESSERACT CONFIG
# =========================
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# =========================
# LOAD TRAINED MODEL FILES
# =========================
MODEL_PATH = "models/nutrition_rf_model.pkl"
ENCODER_PATH = "models/nutrition_label_encoder.pkl"
FEATURES_PATH = "models/nutrition_feature_columns.pkl"

model = joblib.load(MODEL_PATH)
label_encoder = joblib.load(ENCODER_PATH)
feature_cols = joblib.load(FEATURES_PATH)


NUTRITION_SCORE_RULES = {
    "energy-kcal_100g": [
        {"type": "max", "name": "good", "value": 120, "score": 4},
        {"type": "max", "name": "moderate", "value": 250, "score": 0},
        {"type": "max", "name": "high", "value": 400, "score": -6},
        {"type": "max", "name": "very_high", "value": 10000, "score": -12},
    ],
    "fat_100g": [
        {"type": "max", "name": "good", "value": 3, "score": 3},
        {"type": "max", "name": "moderate", "value": 10, "score": 0},
        {"type": "max", "name": "high", "value": 20, "score": -4},
        {"type": "max", "name": "very_high", "value": 1000, "score": -8},
    ],
    "saturated-fat_100g": [
        {"type": "max", "name": "good", "value": 1.5, "score": 4},
        {"type": "max", "name": "moderate", "value": 5, "score": -3},
        {"type": "max", "name": "high", "value": 10, "score": -7},
        {"type": "max", "name": "very_high", "value": 1000, "score": -11},
    ],
    "carbohydrates_100g": [
        {"type": "max", "name": "good", "value": 15, "score": 1},
        {"type": "max", "name": "moderate", "value": 30, "score": 0},
        {"type": "max", "name": "high", "value": 60, "score": -2},
        {"type": "max", "name": "very_high", "value": 1000, "score": -4},
    ],
    "sugars_100g": [
        {"type": "max", "name": "good", "value": 5, "score": 5},
        {"type": "max", "name": "moderate", "value": 12.5, "score": 0},
        {"type": "max", "name": "high", "value": 22.5, "score": -7},
        {"type": "max", "name": "very_high", "value": 1000, "score": -12},
    ],
    "fiber_100g": [
        {"type": "min", "name": "very_high", "value": 8, "score": 7},
        {"type": "min", "name": "high", "value": 5, "score": 5},
        {"type": "min", "name": "moderate", "value": 2.5, "score": 2},
        {"type": "min", "name": "low", "value": 0, "score": 0},
    ],
    "proteins_100g": [
        {"type": "min", "name": "very_high", "value": 20, "score": 6},
        {"type": "min", "name": "high", "value": 10, "score": 4},
        {"type": "min", "name": "moderate", "value": 5, "score": 2},
        {"type": "min", "name": "low", "value": 0, "score": 0},
    ],
    "sodium_100g": [
        {"type": "max", "name": "good", "value": 0.12, "score": 4},
        {"type": "max", "name": "moderate", "value": 0.6, "score": -3},
        {"type": "max", "name": "high", "value": 1.5, "score": -8},
        {"type": "max", "name": "very_high", "value": 1000, "score": -12},
    ],
}

CLASS_BASE_FLOOR = {
    "healthy": 85,
    "moderate": 60,
    "unhealthy": 30,
}

CLASS_SCORE_CEILING = {
    "healthy": 100,
    "moderate": 79,
    "unhealthy": 59,
}

NUTRITION_ALIASES = {
    "energy-kcal_100g": ["calories", "energy", "kcal", "cal"],
    "fat_100g": ["total fat", "fat"],
    "saturated-fat_100g": ["saturated fat", "sat fat", "saturates"],
    "carbohydrates_100g": ["total carbohydrate", "carbohydrate", "carbohydrates", "carbs"],
    "sugars_100g": ["total sugars", "added sugars", "added sugar", "sugars", "sugar"],
    "fiber_100g": ["dietary fiber", "dietary fibre", "fiber", "fibre"],
    "proteins_100g": ["protein", "proteins"],
    "sodium_100g": ["sodium", "salt", "na"],
}

COMMON_OCR_FIXES = {
    "per tog": "per 100g",
    "per lo0g": "per 100g",
    "per 100 g": "per 100g",
    "l00": "100",
    "o g": "0 g",
    "o mg": "0 mg",
    "omg": "0mg",
    "og added": "0g added",
    "maq": "mg",
    "mq": "mg",
    "m9": "mg",
    "enq": "mg",
    "sugats": "sugars",
    "fibet": "fiber",
    "proteir": "protein",
}


def extract_text(img_path):
    text = extract_text_candidates(img_path, mode="nutrition")
    for wrong, right in COMMON_OCR_FIXES.items():
        text = text.replace(wrong, right)
    return text


def extract_text_payload(img_path):
    payload = extract_nutrition_ocr_payload(img_path)
    raw_text = payload.get("raw_text", "") or ""
    structured_text = payload.get("structured_text", "") or raw_text

    for wrong, right in COMMON_OCR_FIXES.items():
        raw_text = raw_text.replace(wrong, right)
        structured_text = structured_text.replace(wrong, right)

    payload["raw_text"] = raw_text
    payload["structured_text"] = structured_text
    payload["merged_text"] = "\n".join(part for part in (structured_text, raw_text) if part)
    return payload


def split_candidate_lines(text):
    lines = []
    raw_lines = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        normalized_line = re.sub(r"\s+", " ", line).lower()
        if re.search(r"[a-z0-9]", normalized_line):
            raw_lines.append(normalized_line)

    index = 0
    while index < len(raw_lines):
        current = raw_lines[index]
        next_line = raw_lines[index + 1] if index + 1 < len(raw_lines) else ""
        if not re.search(r"\d", current) and next_line and re.search(r"\d", next_line):
            lines.append(f"{current} {next_line}")
            index += 2
            continue
        lines.append(current)
        index += 1
    return lines


def parse_value_with_unit(raw_value, unit):
    value = float(raw_value.replace(",", "."))
    normalized_unit = (unit or "").lower()

    if normalized_unit == "mg":
        value = value / 1000.0
    elif normalized_unit == "mcg":
        value = value / 1000000.0
    elif normalized_unit == "kj":
        value = value / 4.184

    return round(value, 4)


def extract_numeric_candidates(text):
    candidates = []
    normalized_text = text.lower()
    normalized_text = normalized_text.replace("kca1", "kcal")
    normalized_text = normalized_text.replace("kca", "kcal")
    normalized_text = normalized_text.replace(" md", " mg")
    normalized_text = normalized_text.replace("¢", " g")
    normalized_text = re.sub(r"(?<=\d)\s*[.,]\s*(?=\d)", ".", normalized_text)
    normalized_text = re.sub(r"(?<=\d)\s*q\b", "g", normalized_text)
    normalized_text = re.sub(r"(?<=\d)\s*kc\b", " kcal", normalized_text)
    normalized_text = re.sub(r"(?<=\d)\s*k\b", " kcal", normalized_text)
    for match in re.finditer(r"(\d+(?:\.\d+)?)\s*(kcal|kj|mg|mcg|g)?", normalized_text):
        suffix = normalized_text[match.end():match.end() + 2]
        if "%" in suffix and not match.group(2):
            continue

        candidates.append(
            {
                "value": parse_value_with_unit(match.group(1), match.group(2)),
                "unit": (match.group(2) or "").lower(),
                "raw_value": match.group(1),
                "start": match.start(),
            }
        )
    return candidates


def plausible_range_for_field(field):
    ranges = {
        "energy-kcal_100g": (0, 1000),
        "fat_100g": (0, 100),
        "saturated-fat_100g": (0, 50),
        "carbohydrates_100g": (0, 100),
        "sugars_100g": (0, 100),
        "fiber_100g": (0, 50),
        "proteins_100g": (0, 50),
        "sodium_100g": (0, 5),
    }
    return ranges[field]


def is_plausible(field, value):
    low, high = plausible_range_for_field(field)
    return low <= value <= high


def find_matching_line_indices(lines, aliases):
    exact_indices = []
    fuzzy_indices = []

    for index, line in enumerate(lines):
        if any(alias in line for alias in aliases):
            exact_indices.append(index)
            continue

        fuzzy_score = 0
        for alias in aliases:
            fuzzy_score = max(
                fuzzy_score,
                fuzz.partial_ratio(line, alias),
                fuzz.token_set_ratio(line, alias),
            )
        if fuzzy_score >= 80:
            fuzzy_indices.append(index)

    return exact_indices or fuzzy_indices


def build_segments_from_line(lines, index):
    segments = [lines[index]]
    for offset in (1, 2):
        if index + offset < len(lines):
            segment = " ".join(lines[index:index + offset + 1])
            segments.append(segment)
    return segments


def extract_candidates_after_alias(segment, alias):
    candidates = []
    start_index = segment.find(alias)
    while start_index != -1:
        search_slice = segment[start_index + len(alias):start_index + len(alias) + 32]
        for candidate in extract_numeric_candidates(search_slice):
            candidate["start"] += start_index + len(alias)
            candidates.append(candidate)
        start_index = segment.find(alias, start_index + 1)
    return candidates


def score_candidate(field, candidate, alias_position=0):
    value = candidate["value"]
    unit = candidate["unit"]
    raw_value = candidate["raw_value"]
    distance = max(0, candidate["start"] - alias_position)

    if not is_plausible(field, value):
        return None

    score = 0

    if field == "energy-kcal_100g":
        if unit in {"kcal", "kj"}:
            score += 30
        if 20 <= value <= 900:
            score += 15
    elif field == "sodium_100g":
        if unit in {"mg", "g"}:
            score += 30
        if 0 < value <= 5:
            score += 12
    else:
        if unit == "g":
            score += 30
        elif unit == "":
            score += 8
        if 0 <= value <= 100:
            score += 10
        if field == "sugars_100g":
            if value <= 40:
                score += 10
            elif value > 60:
                score -= 16
        if field == "fiber_100g":
            if value <= 20:
                score += 10
            elif value > 25:
                score -= 20
        if field == "proteins_100g" and value <= 30:
            score += 6
        if field == "fat_100g" and 5 <= value <= 60:
            score += 6

    if "." in raw_value:
        score += 2

    score -= min(distance, 40)

    if field == "energy-kcal_100g" and value < 20:
        score -= 30
    if field == "sodium_100g" and value <= 0.02:
        score -= 18
    return score


def select_best_value(candidates, field, alias_position=0):
    expected_units = {"g", ""} if field != "energy-kcal_100g" else {"kcal", "kj", ""}
    if field == "sodium_100g":
        expected_units = {"mg", "g", ""}

    ranked = []
    for candidate in candidates:
        variants = [candidate]

        if (
            field not in {"energy-kcal_100g", "sodium_100g"}
            and "." not in candidate["raw_value"]
            and candidate["unit"] in {"", "g"}
            and len(candidate["raw_value"]) >= 3
        ):
            digits = candidate["raw_value"].lstrip("0") or "0"
            if len(digits) >= 2:
                variants.append({**candidate, "value": float(digits) / 10.0})
            if len(digits) >= 3:
                variants.append({**candidate, "value": float(digits) / 100.0})

        for variant in variants:
            score = score_candidate(field, variant, alias_position=alias_position)
            if score is None:
                continue

            if variant["unit"] in expected_units:
                score += 10
            if variant["unit"]:
                score += 3
            ranked.append((score, variant["start"], variant["value"]))

    if not ranked:
        return None

    ranked.sort(key=lambda item: (item[0], -item[1]), reverse=True)
    return ranked[0][2]


def extract_field_value(lines, aliases, field):
    candidate_indices = find_matching_line_indices(lines, aliases)
    fallback_candidates = []

    for index in candidate_indices:
        line = lines[index]
        for alias in aliases:
            if alias in line:
                alias_position = line.find(alias)
                exact_candidates = extract_candidates_after_alias(line, alias)
                best_exact = select_best_value(exact_candidates, field, alias_position=alias_position)
                if best_exact is not None:
                    return best_exact

        line_candidates = extract_numeric_candidates(line)
        best_line = select_best_value(line_candidates, field)
        if best_line is not None:
            return best_line

        for lookahead_index in range(index + 1, min(len(lines), index + 3)):
            next_line_candidates = extract_numeric_candidates(lines[lookahead_index])
            best_next_line = select_best_value(next_line_candidates, field)
            if best_next_line is not None:
                return best_next_line

        for segment in build_segments_from_line(lines, index)[1:]:
            combined_candidates = []
            for alias in aliases:
                if alias in segment:
                    alias_position = segment.find(alias)
                    combined_candidates.extend(extract_candidates_after_alias(segment, alias))

            best_combined = select_best_value(combined_candidates, field, alias_position=0)
            if best_combined is not None:
                return best_combined

            fallback_candidates.extend(extract_numeric_candidates(segment))

    return select_best_value(fallback_candidates, field)


def extract_nutrition(text):
    lines = split_candidate_lines(text)
    result = {field: 0.0 for field in NUTRITION_ALIASES}

    for field, aliases in NUTRITION_ALIASES.items():
        value = extract_field_value(lines, aliases, field)
        if value is not None:
            result[field] = value

    return result


def _nutrition_candidate_score(text, nutrition_json):
    non_zero_fields = [field for field, value in nutrition_json.items() if value not in (None, 0, 0.0)]
    score = len(non_zero_fields) * 25
    score += sum(1 for field in NUTRITION_ALIASES if any(alias in text for alias in NUTRITION_ALIASES[field])) * 6

    for field in non_zero_fields:
        value = nutrition_json[field]
        if field == "energy-kcal_100g" and 20 <= value <= 900:
            score += 18
        elif field == "sodium_100g" and 0 < value <= 5:
            score += 16
        elif field in {"fat_100g", "carbohydrates_100g", "sugars_100g"} and 0 <= value <= 100:
            score += 12
        elif field in {"proteins_100g", "fiber_100g", "saturated-fat_100g"} and 0 <= value <= 50:
            score += 12

    repeated_ones = sum(1 for value in nutrition_json.values() if value == 1.0)
    if repeated_ones >= 3:
        score -= 80

    if all(value == 0.0 for value in nutrition_json.values()):
        score -= 100

    noise = len(re.findall(r"[^a-z0-9\s.%:/()<>-]", text))
    score -= min(noise, 40) * 2
    return score


def _field_value_score(field, value, candidate_score):
    score = candidate_score
    if field == "energy-kcal_100g":
        if 20 <= value <= 900:
            score += 24
        elif value < 20:
            score -= 40
    elif field == "sodium_100g":
        if 0.02 < value <= 5:
            score += 24
        elif value <= 0.02:
            score -= 35
        if 0.05 <= value <= 2:
            score += 12
    else:
        if 0 < value <= 100:
            score += 16
        if 0 < value < 0.2:
            score -= 10
        if field == "fat_100g" and 5 <= value <= 60:
            score += 12
        if field == "saturated-fat_100g":
            if 0.5 <= value <= 30:
                score += 14
            elif value < 0.5:
                score -= 12
        if field == "fiber_100g":
            if 0 < value <= 20:
                score += 16
            elif value > 25:
                score -= 24
        if field == "sugars_100g":
            if value <= 40:
                score += 10
            elif value > 60:
                score -= 18
        if field == "proteins_100g" and value <= 30:
            score += 10
    return score


def _field_signal_score(text, aliases):
    lowered = text.lower()
    best = 0
    for alias in aliases:
        escaped = re.escape(alias)
        if re.search(rf"{escaped}[^\n]{{0,24}}\d", lowered):
            best = max(best, 28)
        elif re.search(rf"\d[^\n]{{0,12}}(?:mg|g|kcal|kj)?[^\n]{{0,24}}{escaped}", lowered):
            best = max(best, 18)
        elif alias in lowered:
            best = max(best, 6)
    return best


def _pick_alternative(field_options, predicate):
    for _, value in field_options:
        if predicate(value):
            return value
    return None


def _apply_field_consistency(final_result, field_rankings):
    if final_result.get("saturated-fat_100g", 0.0) < 0.5:
        better_sat_fat = _pick_alternative(
            field_rankings.get("saturated-fat_100g", []),
            lambda value: 0.5 <= value <= 30,
        )
        if better_sat_fat is not None:
            final_result["saturated-fat_100g"] = better_sat_fat

    saturated_fat = final_result.get("saturated-fat_100g", 0.0)
    total_fat = final_result.get("fat_100g", 0.0)
    if saturated_fat > 0:
        better_total_fat = _pick_alternative(
            field_rankings.get("fat_100g", []),
            lambda value: value > saturated_fat and value <= 100,
        )
        if total_fat <= saturated_fat and better_total_fat is not None:
            final_result["fat_100g"] = better_total_fat

    if final_result.get("fiber_100g", 0.0) > 25:
        better_fiber = _pick_alternative(
            field_rankings.get("fiber_100g", []),
            lambda value: 0 < value <= 20,
        )
        if better_fiber is not None:
            final_result["fiber_100g"] = better_fiber

    if final_result.get("sugars_100g", 0.0) > 60:
        better_sugars = _pick_alternative(
            field_rankings.get("sugars_100g", []),
            lambda value: 0 <= value <= 40,
        )
        if better_sugars is not None:
            final_result["sugars_100g"] = better_sugars

    if final_result.get("sodium_100g", 0.0) < 0.05:
        better_sodium = _pick_alternative(
            field_rankings.get("sodium_100g", []),
            lambda value: 0.05 <= value <= 5,
        )
        if better_sodium is not None:
            final_result["sodium_100g"] = better_sodium
    elif final_result.get("sodium_100g", 0.0) < 0.3:
        stronger_sodium = _pick_alternative(
            field_rankings.get("sodium_100g", []),
            lambda value: 0.5 <= value <= 5,
        )
        if stronger_sodium is not None:
            final_result["sodium_100g"] = stronger_sodium

    return final_result


def _collect_nutrition_text_candidates(img_path):
    payload = extract_text_payload(img_path)
    candidates = [
        payload.get("structured_text", ""),
        payload.get("raw_text", ""),
        payload.get("merged_text", ""),
        extract_text(img_path),
    ]
    candidates.extend(extract_nutrition_table_texts(img_path))

    deduped = []
    seen = set()
    for candidate in candidates:
        candidate = (candidate or "").strip()
        if not candidate:
            continue
        key = re.sub(r"\s+", " ", candidate)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(candidate)
    return payload, deduped


def extract_best_nutrition(img_path):
    payload, candidates = _collect_nutrition_text_candidates(img_path)
    best_result = {field: 0.0 for field in NUTRITION_ALIASES}
    best_candidate_text = payload.get("raw_text", "")
    best_candidate_score = float("-inf")
    per_field_best = {field: (float("-inf"), 0.0) for field in NUTRITION_ALIASES}
    field_rankings = {field: [] for field in NUTRITION_ALIASES}
    debug_candidates = []

    for candidate_text in candidates:
        nutrition_json = extract_nutrition(candidate_text)
        candidate_score = _nutrition_candidate_score(candidate_text, nutrition_json)
        debug_candidates.append(
            {
                "score": candidate_score,
                "text": candidate_text,
                "nutrition_json": nutrition_json,
            }
        )

        if candidate_score > best_candidate_score:
            best_candidate_score = candidate_score
            best_candidate_text = candidate_text
            best_result = dict(nutrition_json)

        for field, value in nutrition_json.items():
            if value in (None, 0, 0.0):
                continue
            signal_score = _field_signal_score(candidate_text, NUTRITION_ALIASES[field])
            if signal_score == 0:
                continue
            field_score = _field_value_score(field, value, candidate_score)
            field_score += signal_score
            field_rankings[field].append((field_score, value))
            if field_score > per_field_best[field][0]:
                per_field_best[field] = (field_score, value)

    final_result = dict(best_result)
    for field, (_, value) in per_field_best.items():
        if value not in (None, 0, 0.0):
            final_result[field] = value

    for field in field_rankings:
        deduped = {}
        for score, value in sorted(field_rankings[field], key=lambda item: item[0], reverse=True):
            key = round(float(value), 4)
            if key in deduped:
                continue
            deduped[key] = (score, value)
        field_rankings[field] = list(deduped.values())

    final_result = _apply_field_consistency(final_result, field_rankings)

    debug_candidates.sort(key=lambda item: item["score"], reverse=True)
    return payload, best_candidate_text, final_result, debug_candidates[:5]


def clamp_score(score):
    return max(0, min(100, int(round(score))))


def apply_rules(value, rules):
    for rule in rules:
        if rule["type"] == "max" and value <= rule["value"]:
            return rule
        if rule["type"] == "min" and value >= rule["value"]:
            return rule
    return None


def calculate_nutrition_health_score(nutrition_json):
    score = 70
    score_breakdown = []

    for nutrient, rules in NUTRITION_SCORE_RULES.items():
        value = float(nutrition_json.get(nutrient, 0.0) or 0.0)
        matched_rule = apply_rules(value, rules)
        if matched_rule is None:
            continue

        delta = matched_rule["score"]
        score += delta
        score_breakdown.append(
            {
                "nutrient": nutrient,
                "value": value,
                "band": matched_rule["name"],
                "score": delta,
            }
        )

    if nutrition_json.get("sugars_100g", 0) <= 5 and nutrition_json.get("sodium_100g", 0) <= 0.12:
        score += 3
    if nutrition_json.get("fiber_100g", 0) >= 5:
        score += 2
    if nutrition_json.get("proteins_100g", 0) >= 10:
        score += 2

    return clamp_score(score), score_breakdown


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


def enforce_prediction_floor(score, prediction_label):
    normalized = normalize_prediction_label(prediction_label)
    if normalized is None:
        return score

    min_score = CLASS_BASE_FLOOR.get(normalized)
    max_score = CLASS_SCORE_CEILING.get(normalized)
    if min_score is None or max_score is None:
        return score

    return clamp_score(max(min_score, min(max_score, score)))


def predict_nutrition_from_image(img_path):
    payload, selected_text, nutrition_json, debug_candidates = extract_best_nutrition(img_path)
    processed_lines = split_candidate_lines(selected_text)

    print("[nutrition] Raw OCR text:")
    print(payload.get("raw_text", ""))
    print("[nutrition] Selected candidate text:")
    print(selected_text)
    print("[nutrition] Processed lines:")
    for line in processed_lines:
        print(f"  {line}")
    print("[nutrition] Extracted values:")
    print(nutrition_json)
    print("[nutrition] Top candidates:")
    for candidate in debug_candidates:
        print(f"  score={candidate['score']} values={candidate['nutrition_json']}")

    if all(v == 0.0 for v in nutrition_json.values()):
        return {
            "success": False,
            "message": "Image not recognized properly",
            "nutrition_data": nutrition_json,
            "prediction": None,
        }

    input_df = pd.DataFrame([nutrition_json])

    for col in feature_cols:
        if col not in input_df:
            input_df[col] = 0

    input_df = input_df[feature_cols]

    pred = model.predict(input_df)
    grade = label_encoder.inverse_transform(pred)
    health_score, score_breakdown = calculate_nutrition_health_score(nutrition_json)
    health_score = enforce_prediction_floor(health_score, grade[0])

    return {
        "success": True,
        "message": "Prediction successful",
        "nutrition_data": nutrition_json,
        "prediction": grade[0],
        "health_score": health_score,
        "base_score": 100,
        "score_breakdown": score_breakdown,
    }
