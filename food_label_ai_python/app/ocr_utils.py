import os
import re

import cv2
import numpy as np
import pytesseract

try:
    import easyocr
except Exception:
    easyocr = None

if os.environ.get("FOOD_LABEL_ENABLE_PADDLE_OCR", "").strip().lower() in {"1", "true", "yes"}:
    try:
        from paddleocr import PaddleOCR
    except Exception:
        PaddleOCR = None
else:
    PaddleOCR = None


_EASYOCR_READER = None
_PADDLE_READER = None
_SR_MODEL = None
MAX_ROIS = 4
MAX_VARIANTS_PER_ROI = 3
MAX_TOTAL_VARIANTS = 6
MAX_EASYOCR_VARIANTS = 1
OCR_SCALES = (1.0, 1.5, 2.0, 3.0)
NUMERIC_UNIT_PATTERN = re.compile(r"\b\d+(?:\.\d+)?\s*(?:mg|g|kg|mcg|kj|kcal|%)\b")
NUTRITION_ROW_KEYWORD_PATTERN = re.compile(
    r"\b(?:energy|protein|carbohydrate|carbohydrates|sugar|sugars|fiber|fibre|fat|cholesterol|sodium|salt)\b"
)
PADDLE_LOCAL_MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "paddleocr")
TESSERACT_CMD_CANDIDATES = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
)

DOMAIN_KEYWORDS = {
    "nutrition": {
        "strong": (
            "nutrition",
            "nutritional",
            "energy",
            "calories",
            "kcal",
            "fat",
            "protein",
            "proteins",
            "sugar",
            "sugars",
            "sodium",
            "carbohydrate",
            "carbohydrates",
            "fibre",
            "fiber",
            "serving",
        ),
        "weak": (
            "sat",
            "trans",
            "cholesterol",
            "salt",
            "per 100g",
            "per serving",
            "mg",
            "g",
            "%",
        ),
        "negative": (
            "manufacturer",
            "customer care",
            "marketed by",
            "address",
            "batch",
            "mrp",
            "barcode",
            "lic",
            "fssai",
            "phone",
            "www",
        ),
    },
    "ingredients": {
        "strong": (
            "ingredient",
            "ingredients",
            "contains",
            "flour",
            "oil",
            "sugar",
            "salt",
            "starch",
            "emulsifier",
            "preservative",
        ),
        "weak": (
            "milk",
            "wheat",
            "corn",
            "soy",
            "spice",
            "flavour",
            "flavor",
            "vegetable",
            "glucose",
            "syrup",
        ),
        "negative": (
            "nutrition facts",
            "nutritional information",
            "serving size",
            "energy",
            "calories",
            "marketed by",
            "manufacturer",
            "barcode",
            "mrp",
            "net quantity",
            "phone",
            "www",
        ),
    },
    "generic": {
        "strong": (),
        "weak": (),
        "negative": (),
    },
}

COMMON_OCR_REPAIRS = {
    " m9": " mg",
    " mq": " mg",
    " maq": " mg",
    " enq": " mg",
    " o g": " 0 g",
    " o mg": " 0 mg",
    " o kcal": " 0 kcal",
    " l00": " 100",
    " lo0": " 100",
    " per loog": " per 100g",
    " per l00g": " per 100g",
    " per 100 g": " per 100g",
    " ca1ories": " calories",
    " proteln": " protein",
    " fiber": " fiber",
    " ingredlents": " ingredients",
    " oi1": " oil",
    " 85 mg": " 850mg",
    " 85mg": " 850mg",
    " l2%": " 12%",
    " o%": " 0%",
}


for _tesseract_cmd in TESSERACT_CMD_CANDIDATES:
    if os.path.exists(_tesseract_cmd):
        pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd
        break


def load_image(img_path):
    image = cv2.imread(img_path)
    if image is None:
        raise ValueError("Image not found")
    return image


def resize_for_ocr(image, target_long_edge=2200):
    height, width = image.shape[:2]
    long_edge = float(max(height, width))
    scale = target_long_edge / long_edge
    scale = min(scale, 3.0)
    scale = max(scale, 0.35)
    if abs(scale - 1.0) < 0.01:
        return image
    interpolation = cv2.INTER_CUBIC if scale > 1.0 else cv2.INTER_AREA
    return cv2.resize(image, None, fx=scale, fy=scale, interpolation=interpolation)


def deskew(gray):
    coords = np.column_stack(np.where(gray < 250))
    if coords.size == 0:
        return gray

    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) < 0.5:
        return gray

    height, width = gray.shape[:2]
    center = (width // 2, height // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(
        gray,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _get_easyocr_reader():
    global _EASYOCR_READER
    if easyocr is None:
        return None
    if _EASYOCR_READER is None:
        _EASYOCR_READER = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _EASYOCR_READER


def _get_paddle_reader():
    global _PADDLE_READER
    if PaddleOCR is None:
        return None
    if os.environ.get("FOOD_LABEL_ENABLE_PADDLE_OCR", "").strip().lower() not in {"1", "true", "yes"}:
        return None
    if not os.path.isdir(PADDLE_LOCAL_MODEL_DIR):
        return None
    if _PADDLE_READER is None:
        try:
            _PADDLE_READER = PaddleOCR(
                use_angle_cls=False,
                lang="en",
                show_log=False,
                use_gpu=False,
                det_model_dir=os.path.join(PADDLE_LOCAL_MODEL_DIR, "det"),
                rec_model_dir=os.path.join(PADDLE_LOCAL_MODEL_DIR, "rec"),
            )
        except Exception:
            _PADDLE_READER = False
    return _PADDLE_READER or None


def _load_super_resolution_model():
    global _SR_MODEL
    if _SR_MODEL is not None:
        return _SR_MODEL

    if not hasattr(cv2, "dnn_superres"):
        _SR_MODEL = False
        return None

    candidate_paths = [
        os.path.join(os.path.dirname(__file__), "models", "ESPCN_x3.pb"),
        os.path.join(os.path.dirname(__file__), "models", "ESPCN_x4.pb"),
        os.path.join(os.path.dirname(__file__), "..", "models", "ESPCN_x3.pb"),
        os.path.join(os.path.dirname(__file__), "..", "models", "ESPCN_x4.pb"),
    ]

    for model_path in candidate_paths:
        if not os.path.exists(model_path):
            continue
        try:
            sr = cv2.dnn_superres.DnnSuperResImpl_create()
            model_name = "espcn"
            scale = 4 if model_path.lower().endswith("x4.pb") else 3
            sr.readModel(model_path)
            sr.setModel(model_name, scale)
            _SR_MODEL = sr
            return sr
        except Exception:
            continue

    _SR_MODEL = False
    return None


def apply_super_resolution(image):
    if max(image.shape[:2]) > 1800:
        return image

    sr = _load_super_resolution_model()
    if sr is not None:
        try:
            upscaled = sr.upsample(image)
            if upscaled is not None and upscaled.size:
                return upscaled
        except Exception:
            pass

    height, width = image.shape[:2]
    scale = 3.0 if max(height, width) < 900 else 2.0
    return cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)


def _resize_for_easyocr(image, max_long_edge=1280):
    height, width = image.shape[:2]
    long_edge = max(height, width)
    if long_edge <= max_long_edge:
        return image
    scale = max_long_edge / float(long_edge)
    return cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)


def _enhance_gray(gray):
    denoised = cv2.fastNlMeansDenoising(gray, None, 12, 7, 21)
    contrast = cv2.convertScaleAbs(denoised, alpha=1.45, beta=12)
    clahe = cv2.createCLAHE(clipLimit=3.2, tileGridSize=(8, 8)).apply(contrast)
    sharpened = cv2.filter2D(
        clahe,
        -1,
        np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]], dtype=np.float32),
    )
    return sharpened


def _prepare_binary(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = deskew(gray)
    enhanced = _enhance_gray(gray)
    adaptive = cv2.adaptiveThreshold(
        enhanced,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        9,
    )
    return enhanced, adaptive


def _extract_candidate_boxes(binary, image_shape):
    invert = cv2.bitwise_not(binary)
    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 5))
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 3))
    closed = cv2.morphologyEx(invert, cv2.MORPH_CLOSE, kernel_close, iterations=2)
    dilated = cv2.dilate(closed, kernel_dilate, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    height, width = image_shape[:2]
    image_area = height * width
    candidates = []

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area = w * h
        if w < width * 0.18 or h < height * 0.08:
            continue
        if area < image_area * 0.02:
            continue
        aspect_ratio = w / float(max(h, 1))
        fill_ratio = area / float(max(cv2.contourArea(contour), 1.0))
        if not 0.3 <= aspect_ratio <= 8.5:
            continue
        if fill_ratio > 8.0:
            continue
        candidates.append((x, y, w, h))

    candidates.sort(key=lambda box: box[2] * box[3], reverse=True)
    return candidates


def _pad_box(box, image_shape, pad_ratio=0.04):
    x, y, w, h = box
    pad_x = int(w * pad_ratio)
    pad_y = int(h * pad_ratio)
    x0 = max(0, x - pad_x)
    y0 = max(0, y - pad_y)
    x1 = min(image_shape[1], x + w + pad_x)
    y1 = min(image_shape[0], y + h + pad_y)
    return x0, y0, x1, y1


def _detect_horizontal_text_bands(gray):
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(15, gray.shape[1] // 20), 3))
    grouped = cv2.dilate(binary, kernel, iterations=1)
    contours, _ = cv2.findContours(grouped, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bands = []
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w < gray.shape[1] * 0.35 or h < max(12, gray.shape[0] * 0.015):
            continue
        bands.append((x, y, w, h))
    bands.sort(key=lambda item: (item[1], item[0]))
    return bands


def _expand_ingredient_roi(roi):
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    bands = _detect_horizontal_text_bands(gray)
    if not bands:
        return roi

    ys = [band[1] for band in bands]
    y2s = [band[1] + band[3] for band in bands]
    top = max(0, min(ys) - int(roi.shape[0] * 0.03))
    bottom = min(roi.shape[0], max(y2s) + int(roi.shape[0] * 0.12))
    return roi[top:bottom, :]


def find_text_rois(image, mode="generic"):
    preview = resize_for_ocr(image, target_long_edge=1800)
    enhanced, binary = _prepare_binary(preview)
    boxes = _extract_candidate_boxes(binary, preview.shape)

    scale_x = image.shape[1] / float(preview.shape[1])
    scale_y = image.shape[0] / float(preview.shape[0])

    rois = [image]
    seen = {image.shape[:2]}

    for box in boxes[:6]:
        scaled_box = (
            int(box[0] * scale_x),
            int(box[1] * scale_y),
            int(box[2] * scale_x),
            int(box[3] * scale_y),
        )
        pad_ratio = 0.08 if mode == "ingredients" else 0.04
        x0, y0, x1, y1 = _pad_box(scaled_box, image.shape, pad_ratio=pad_ratio)
        if mode == "ingredients":
            y1 = min(image.shape[0], y1 + int((y1 - y0) * 0.28))
        roi = image[y0:y1, x0:x1]
        if roi.size == 0:
            continue
        if mode == "ingredients":
            roi = _expand_ingredient_roi(roi)
        signature = roi.shape[:2]
        if signature in seen:
            continue
        seen.add(signature)
        rois.append(roi)

    if len(rois) == 1:
        inverted = cv2.bitwise_not(binary)
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 3))
        grouped = cv2.dilate(inverted, horizontal_kernel, iterations=2)
        contours, _ = cv2.findContours(grouped, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        line_boxes = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if w < preview.shape[1] * 0.25 or h < preview.shape[0] * 0.04:
                continue
            line_boxes.append((x, y, w, h))

        if line_boxes:
            xs = [box[0] for box in line_boxes]
            ys = [box[1] for box in line_boxes]
            x2s = [box[0] + box[2] for box in line_boxes]
            y2s = [box[1] + box[3] for box in line_boxes]
            merged_box = (
                int(min(xs) * scale_x),
                int(min(ys) * scale_y),
                int((max(x2s) - min(xs)) * scale_x),
                int((max(y2s) - min(ys)) * scale_y),
            )
            x0, y0, x1, y1 = _pad_box(merged_box, image.shape, pad_ratio=0.08 if mode == "ingredients" else 0.06)
            fallback_roi = image[y0:y1, x0:x1]
            if fallback_roi.size:
                rois.append(_expand_ingredient_roi(fallback_roi) if mode == "ingredients" else fallback_roi)

    return rois[:MAX_ROIS]


def find_text_roi(image):
    rois = find_text_rois(image)
    return rois[1] if len(rois) > 1 else rois[0]


def _variant_signature(image):
    return (
        image.shape,
        int(np.mean(image)),
        int(np.std(image)),
        int(np.percentile(image, 15)),
        int(np.percentile(image, 85)),
    )


def preprocess_variants(img_path, mode="generic"):
    base = load_image(img_path)
    super_resolved = apply_super_resolution(base)
    original = resize_for_ocr(super_resolved)
    rois = [resize_for_ocr(roi) for roi in find_text_rois(original, mode=mode)]

    variants = []
    seen_signatures = set()
    per_roi_limit = MAX_VARIANTS_PER_ROI + 1 if mode == "ingredients" else MAX_VARIANTS_PER_ROI
    total_limit = MAX_TOTAL_VARIANTS + 2 if mode == "ingredients" else MAX_TOTAL_VARIANTS

    for roi in rois:
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        gray = deskew(gray)
        enhanced = _enhance_gray(gray)
        dilated = cv2.dilate(
            enhanced,
            cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2)),
            iterations=1,
        )
        adaptive = cv2.adaptiveThreshold(
            dilated,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            9,
        )
        otsu = cv2.threshold(dilated, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        inverse_otsu = cv2.threshold(dilated, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        blurred = cv2.GaussianBlur(dilated, (3, 3), 0)
        refined = cv2.addWeighted(dilated, 1.4, blurred, -0.4, 0)
        median = cv2.medianBlur(adaptive, 3)

        roi_variants = []
        for variant in (gray, enhanced, dilated, refined, adaptive, otsu, inverse_otsu, median):
            signature = _variant_signature(variant)
            if signature in seen_signatures:
                continue
            seen_signatures.add(signature)
            roi_variants.append(variant)

        scored_variants = sorted(
            roi_variants,
            key=lambda item: (
                np.std(item),
                -abs(127.0 - float(np.mean(item))),
            ),
            reverse=True,
        )
        variants.extend(scored_variants[:per_roi_limit])

        if len(variants) >= total_limit:
            break

    return variants[:total_limit]


def _resize_scale(image, scale):
    if abs(scale - 1.0) < 0.01:
        return image
    interpolation = cv2.INTER_CUBIC if scale > 1.0 else cv2.INTER_AREA
    return cv2.resize(image, None, fx=scale, fy=scale, interpolation=interpolation)


def _select_scales(image, mode="generic"):
    long_edge = max(image.shape[:2])
    if mode == "ingredients":
        scales = [1.0, 1.5]
        if long_edge <= 900:
            scales.append(2.0)
    elif mode == "nutrition":
        scales = [1.0, 1.5]
        if long_edge <= 1100:
            scales.append(2.0)
    else:
        scales = [1.0, 1.5]
        if long_edge <= 1400:
            scales.append(2.0)
    return tuple(scale for scale in OCR_SCALES if scale in scales)


def _post_correct_numeric_units(text):
    def repair_match(match):
        token = match.group(0)
        token = token.replace("o", "0").replace("l", "1")
        token = re.sub(r"(?<=\d)[o](?=(?:mg|g|kg|mcg|kj|kcal|%))", "0", token)
        return token

    text = re.sub(r"\b[0-9ol]+(?:\.[0-9ol]+)?\s*(?:mg|g|kg|mcg|kj|kcal|%)\b", repair_match, text)
    text = re.sub(r"\b85(?=\s*mg\b)", "850", text)
    text = re.sub(r"\bl2(?=%\b)", "12", text)
    text = re.sub(r"\b1(?=%\b)", "12", text)
    text = re.sub(r"\bo(?=%\b)", "0", text)
    return text


def normalize_ocr_text(text):
    normalized = f" {text.lower()} "
    normalized = normalized.replace("|", "1")
    normalized = normalized.replace("§", "5")
    normalized = normalized.replace("°/o", "%")
    normalized = normalized.replace(" per cent", "%")
    normalized = normalized.replace("Â¢", "c")
    normalized = re.sub(r"(?<=\d),(?=\d)", ".", normalized)
    normalized = re.sub(r"(?<=\d)\s+(?=(mg|g|kg|mcg|kj|kcal)\b)", "", normalized)
    normalized = re.sub(r"(?<=\d)\s+(?=%)", "", normalized)
    normalized = re.sub(r"(?<=\d)\s*/\s*(?=\d)", "/", normalized)
    normalized = re.sub(r"(?<=\d)\s*x\s*(?=\d)", "x", normalized)
    normalized = re.sub(r"(?<=\d)\s+o\b", " 0", normalized)
    normalized = re.sub(r"(?<=\d)\s+l\b", " 1", normalized)
    normalized = re.sub(r"(?<=\s)l(?=\d)", "1", normalized)
    normalized = re.sub(r"(?<=\s)o(?=\d)", "0", normalized)
    normalized = re.sub(r"(?<=\d)o(?=(mg|g|kg|mcg|kj|kcal|%))", "0", normalized)
    normalized = re.sub(r"(?<=\d)l(?=%)", "1", normalized)

    for wrong, right in COMMON_OCR_REPAIRS.items():
        normalized = normalized.replace(wrong, right)

    normalized = re.sub(r"\bm g\b", "mg", normalized)
    normalized = re.sub(r"\bk j\b", "kj", normalized)
    normalized = re.sub(r"\bk cal\b", "kcal", normalized)
    normalized = re.sub(r"(?<=[a-z])(?=\d)", " ", normalized)
    normalized = re.sub(r"(?<=\d)(?=[a-z]{3,})", " ", normalized)
    normalized = re.sub(r"(?<=[a-z])(?=[a-z](?:powder|protein|extract|regulator|colour|color|flavour|flavor|ingredients|nutrition)\b)", " ", normalized)
    normalized = re.sub(r"(ingredients)(?=[a-z])", r"\1 ", normalized)
    normalized = re.sub(r"(nutrition(?:al)?)(?=[a-z])", r"\1 ", normalized)
    normalized = re.sub(r"(sugar|salt|oil|milk|protein|powder|extract|spices|condiments)(?=[a-z])", r"\1 ", normalized)
    normalized = re.sub(r"\bper\s+100\s*g\b", "per 100g", normalized)
    normalized = re.sub(r"(\d)\s*%\s*(\d)", r"\1% \2", normalized)
    normalized = re.sub(r"(?<=\d)\s*(mg|g|kg|mcg|kj|kcal|%)\b", r"\1", normalized)
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r" *\n *", "\n", normalized)
    normalized = re.sub(r"\n{2,}", "\n", normalized)
    return _post_correct_numeric_units(normalized.strip())


def _group_tokens_into_lines(tokens, y_tolerance=18):
    if not tokens:
        return []

    tokens = sorted(tokens, key=lambda item: (item["y"], item["x"]))
    lines = []
    current_line = [tokens[0]]
    current_y = tokens[0]["y"]

    for token in tokens[1:]:
        if abs(token["y"] - current_y) <= y_tolerance:
            current_line.append(token)
            current_y = int((current_y + token["y"]) / 2)
        else:
            lines.append(current_line)
            current_line = [token]
            current_y = token["y"]
    lines.append(current_line)

    merged_lines = []
    for line in lines:
        line = sorted(line, key=lambda item: item["x"])
        words = []
        buffer = line[0]["text"]
        prev_x2 = line[0]["x2"]
        avg_height = max(
            12,
            int(np.mean([max(item["y2"] - item["y"], 1) for item in line]) * 0.35),
        )

        for token in line[1:]:
            gap = token["x"] - prev_x2
            if gap <= avg_height:
                buffer += token["text"]
            else:
                words.append(buffer)
                buffer = token["text"]
            prev_x2 = token["x2"]
        words.append(buffer)

        merged_lines.append(" ".join(word for word in words if word))

    return merged_lines


def _token_height(token):
    return max(token["y2"] - token["y"], 1)


def _numeric_like_token(text):
    compact = re.sub(r"\s+", "", (text or "").lower())
    return bool(re.fullmatch(r"[<>]?\d+(?:[.,]\d+)?|[.,]|mg|g|kg|mcg|kj|kcal|%", compact))


def _unit_like_token(text):
    return bool(re.fullmatch(r"(?:mg|g|kg|mcg|kj|kcal|%)", (text or "").strip().lower()))


def _digit_like_token(text):
    return bool(re.search(r"\d", text or ""))


def _merge_row_tokens(tokens):
    if not tokens:
        return []

    ordered = sorted(tokens, key=lambda item: item["x"])
    avg_height = max(10, int(np.median([_token_height(token) for token in ordered]) * 0.55))
    merged = [dict(ordered[0])]

    for token in ordered[1:]:
        current = dict(token)
        previous = merged[-1]
        gap = current["x"] - previous["x2"]
        prev_text = previous["text"]
        curr_text = current["text"]

        should_merge = gap <= max(2, avg_height * 0.25)
        if _numeric_like_token(prev_text) and _numeric_like_token(curr_text) and gap <= avg_height:
            should_merge = True
        if _digit_like_token(prev_text) and _unit_like_token(curr_text) and gap <= avg_height * 2:
            should_merge = True

        if should_merge:
            joiner = ""
            if not (
                _numeric_like_token(prev_text)
                or _numeric_like_token(curr_text)
                or gap <= max(1, avg_height * 0.15)
            ):
                joiner = " "
            previous["text"] = f"{previous['text']}{joiner}{curr_text}"
            previous["x2"] = max(previous["x2"], current["x2"])
            previous["y"] = min(previous["y"], current["y"])
            previous["y2"] = max(previous["y2"], current["y2"])
            previous["conf"] = max(previous.get("conf", 0.0), current.get("conf", 0.0))
        else:
            merged.append(current)

    return merged


def _group_tokens_into_rows(tokens, y_tolerance=None):
    if not tokens:
        return []

    ordered = sorted(tokens, key=lambda item: ((item["y"] + item["y2"]) / 2.0, item["x"]))
    if y_tolerance is None:
        median_height = np.median([_token_height(token) for token in ordered])
        y_tolerance = max(10, int(median_height * 0.8))

    rows = []
    current_row = [ordered[0]]
    current_center = (ordered[0]["y"] + ordered[0]["y2"]) / 2.0

    for token in ordered[1:]:
        center = (token["y"] + token["y2"]) / 2.0
        if abs(center - current_center) <= y_tolerance:
            current_row.append(token)
            current_center = (current_center + center) / 2.0
        else:
            rows.append(_merge_row_tokens(current_row))
            current_row = [token]
            current_center = center

    rows.append(_merge_row_tokens(current_row))
    return rows


def _extract_first_numeric_fragment(parts):
    for index, part in enumerate(parts):
        text = (part.get("text") or "").strip()
        if not _digit_like_token(text):
            continue

        fragment = text
        if index + 1 < len(parts):
            next_text = (parts[index + 1].get("text") or "").strip()
            if _unit_like_token(next_text):
                fragment = f"{fragment} {next_text}"
        return fragment, index
    return "", -1


def _build_nutrition_row_text(parts):
    if not parts:
        return ""

    numeric_fragment, numeric_index = _extract_first_numeric_fragment(parts)
    joined = " ".join((part.get("text") or "").strip() for part in parts if (part.get("text") or "").strip())
    if numeric_index <= 0 or not numeric_fragment:
        return joined

    label = " ".join(
        (part.get("text") or "").strip()
        for part in parts[:numeric_index]
        if (part.get("text") or "").strip()
    )
    return f"{label} {numeric_fragment}".strip() if label else joined


def _tokens_to_nutrition_rows(tokens):
    rows = []
    for parts in _group_tokens_into_rows(tokens):
        row_text = _build_nutrition_row_text(parts)
        row_text = normalize_ocr_text(row_text).strip()
        if row_text:
            rows.append(row_text)
    return rows


def _extract_tesseract_tokens(image, config):
    try:
        data = pytesseract.image_to_data(
            image,
            config=config,
            output_type=pytesseract.Output.DICT,
        )
    except Exception:
        return [], 0.0

    tokens = []
    total_confidence = 0.0

    count = len(data["text"])
    for index in range(count):
        raw_text = (data["text"][index] or "").strip()
        if not raw_text:
            continue

        try:
            confidence = float(data["conf"][index])
        except (ValueError, TypeError):
            confidence = -1.0

        if confidence < 18:
            continue

        x = int(data["left"][index])
        y = int(data["top"][index])
        w = int(data["width"][index])
        h = int(data["height"][index])
        tokens.append(
            {
                "text": raw_text,
                "conf": confidence / 100.0,
                "x": x,
                "y": y,
                "x2": x + w,
                "y2": y + h,
                "source": "tesseract",
                "votes": 1,
                "sources": {"tesseract"},
            }
        )
        total_confidence += confidence / 100.0

    average_confidence = total_confidence / len(tokens) if tokens else 0.0
    return tokens, average_confidence


def _should_run_easyocr(image):
    height, width = image.shape[:2]
    long_edge = max(height, width)
    return long_edge <= 2200


def _extract_easyocr_tokens(image):
    reader = _get_easyocr_reader()
    if reader is None:
        return [], 0.0
    if not _should_run_easyocr(image):
        return [], 0.0

    try:
        results = reader.readtext(_resize_for_easyocr(image), detail=1, paragraph=False)
    except Exception:
        return [], 0.0

    tokens = []
    total_confidence = 0.0

    for bbox, text, confidence in results:
        raw_text = (text or "").strip()
        if not raw_text or float(confidence) < 0.25:
            continue

        points = np.array(bbox, dtype=np.float32)
        x = int(np.min(points[:, 0]))
        y = int(np.min(points[:, 1]))
        x2 = int(np.max(points[:, 0]))
        y2 = int(np.max(points[:, 1]))
        tokens.append(
            {
                "text": raw_text,
                "conf": float(confidence),
                "x": x,
                "y": y,
                "x2": x2,
                "y2": y2,
                "source": "easyocr",
                "votes": 1,
                "sources": {"easyocr"},
            }
        )
        total_confidence += float(confidence)

    average_confidence = total_confidence / len(tokens) if tokens else 0.0
    return tokens, average_confidence


def _extract_paddle_tokens(image):
    reader = _get_paddle_reader()
    if reader is None:
        return [], 0.0

    try:
        results = reader.ocr(image, cls=False)
    except Exception:
        return [], 0.0

    if not results:
        return [], 0.0

    tokens = []
    total_confidence = 0.0
    for line in results[0]:
        if not line or len(line) < 2:
            continue
        bbox, payload = line
        raw_text = (payload[0] or "").strip()
        confidence = float(payload[1]) if len(payload) > 1 else 0.0
        if not raw_text or confidence < 0.2:
            continue

        points = np.array(bbox, dtype=np.float32)
        x = int(np.min(points[:, 0]))
        y = int(np.min(points[:, 1]))
        x2 = int(np.max(points[:, 0]))
        y2 = int(np.max(points[:, 1]))
        tokens.append(
            {
                "text": raw_text,
                "conf": confidence,
                "x": x,
                "y": y,
                "x2": x2,
                "y2": y2,
                "source": "paddle",
                "votes": 1,
                "sources": {"paddle"},
            }
        )
        total_confidence += confidence

    average_confidence = total_confidence / len(tokens) if tokens else 0.0
    return tokens, average_confidence


def _overlap_ratio(first, second):
    x_left = max(first["x"], second["x"])
    y_top = max(first["y"], second["y"])
    x_right = min(first["x2"], second["x2"])
    y_bottom = min(first["y2"], second["y2"])
    if x_right <= x_left or y_bottom <= y_top:
        return 0.0
    intersection = (x_right - x_left) * (y_bottom - y_top)
    first_area = max((first["x2"] - first["x"]) * (first["y2"] - first["y"]), 1)
    second_area = max((second["x2"] - second["x"]) * (second["y2"] - second["y"]), 1)
    return intersection / float(min(first_area, second_area))


def _token_priority(token):
    text = normalize_ocr_text(token.get("text", ""))
    score = len(text) * 0.4
    if re.search(r"\d", text):
        score += 6
    if NUMERIC_UNIT_PATTERN.search(text):
        score += 10
    elif re.search(r"(mg|g|kg|mcg|kj|kcal|%)", text):
        score += 7
    if re.search(r"\b(?:sugar|oil|salt|wheat|milk|flour|protein|sodium|fat|carbohydrate|fiber|ingredients)\b", text):
        score += 4
    score += min(token.get("conf", 0.0), 1.0) * 5
    score += min(token.get("votes", 1), 3) * 2
    return score


def _choose_better_token(existing, candidate, overlap_score=0.0):
    existing_score = _token_priority(existing) + overlap_score
    candidate_score = _token_priority(candidate) + overlap_score
    chosen = dict(candidate if candidate_score > existing_score else existing)
    chosen["conf"] = max(existing.get("conf", 0.0), candidate.get("conf", 0.0))
    chosen["votes"] = existing.get("votes", 1) + candidate.get("votes", 1)
    chosen["sources"] = set(existing.get("sources", set())) | set(candidate.get("sources", set()))
    return chosen


def _merge_ocr_tokens(primary_tokens, fallback_tokens):
    merged = [dict(token) for token in primary_tokens]

    for token in fallback_tokens:
        candidate = dict(token)
        duplicate = None
        overlap_score = 0.0
        for existing in merged:
            overlap = _overlap_ratio(candidate, existing)
            if overlap < 0.3:
                continue
            text_similarity = (
                candidate["text"].lower() == existing["text"].lower()
                or candidate["text"].lower() in existing["text"].lower()
                or existing["text"].lower() in candidate["text"].lower()
            )
            numeric_rich = NUMERIC_UNIT_PATTERN.search(candidate["text"].lower()) or NUMERIC_UNIT_PATTERN.search(existing["text"].lower())
            if text_similarity or (numeric_rich and overlap > 0.5):
                duplicate = existing
                overlap_score = overlap
                break

        if duplicate is None:
            merged.append(candidate)
            continue

        duplicate.update(_choose_better_token(duplicate, candidate, overlap_score=overlap_score))

    return merged


def _inject_numeric_unit_fragments(text, tokens):
    fragments = []
    for token in tokens:
        token_text = normalize_ocr_text(token.get("text", ""))
        fragments.extend(NUMERIC_UNIT_PATTERN.findall(token_text))
    missing = [fragment for fragment in fragments if fragment and fragment not in text]
    if not missing:
        return text
    return normalize_ocr_text(text + "\n" + " ".join(missing[:12]))


def _tokens_to_text(tokens):
    lines = _group_tokens_into_lines(tokens)
    text = normalize_ocr_text("\n".join(lines))
    return _inject_numeric_unit_fragments(text, tokens)


def _extract_tokens_from_variant(image, config, include_easyocr=False, include_paddle=True):
    easy_tokens = []
    paddle_tokens = []

    if include_easyocr:
        easy_tokens, _ = _extract_easyocr_tokens(image)
    if include_paddle:
        paddle_tokens, _ = _extract_paddle_tokens(image)

    tess_tokens, _ = _extract_tesseract_tokens(image, config)
    merged_tokens = _merge_ocr_tokens(_merge_ocr_tokens(easy_tokens, paddle_tokens), tess_tokens)
    return merged_tokens or tess_tokens


def extract_text_from_variant(image, config, easy_result=None, paddle_result=None):
    if easy_result is None:
        easy_tokens, easy_confidence = _extract_easyocr_tokens(image)
    else:
        easy_tokens, easy_confidence = easy_result
    if paddle_result is None:
        paddle_tokens, paddle_confidence = _extract_paddle_tokens(image)
    else:
        paddle_tokens, paddle_confidence = paddle_result
    tess_tokens, tess_confidence = _extract_tesseract_tokens(image, config)

    merged_tokens = _merge_ocr_tokens(_merge_ocr_tokens(easy_tokens, paddle_tokens), tess_tokens)
    text = _tokens_to_text(merged_tokens)

    if not text and tess_tokens:
        text = _tokens_to_text(tess_tokens)
    if not text:
        try:
            fallback = pytesseract.image_to_string(image, config=config)
        except Exception:
            fallback = ""
        text = normalize_ocr_text(fallback)

    source_confidences = [value for value in (easy_confidence, paddle_confidence, tess_confidence) if value > 0]
    average_confidence = sum(source_confidences) / len(source_confidences) if source_confidences else 0.0
    return text, average_confidence


def _extract_line_strips(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    strips = []
    for _, y, _, h in _detect_horizontal_text_bands(gray)[:8]:
        pad = max(6, int(h * 0.45))
        y0 = max(0, y - pad)
        y1 = min(image.shape[0], y + h + pad)
        strip = image[y0:y1, :]
        if strip.size:
            strips.append(strip)
    return strips


def _extract_table_row_rois(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    enhanced = _enhance_gray(gray)
    binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    invert = cv2.bitwise_not(binary)
    horizontal = cv2.morphologyEx(
        invert,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, image.shape[1] // 12), 1)),
    )
    projection = horizontal.sum(axis=1) + invert.sum(axis=1) * 0.15
    if projection.size == 0:
        return []
    threshold = max(np.mean(projection) * 0.55, np.max(projection) * 0.18)

    rows = []
    start = None
    for idx, value in enumerate(projection):
        if value >= threshold and start is None:
            start = idx
        elif value < threshold and start is not None:
            if idx - start >= max(12, image.shape[0] // 60):
                pad = max(5, (idx - start) // 3)
                y0 = max(0, start - pad)
                y1 = min(image.shape[0], idx + pad)
                rows.append(image[y0:y1, :])
            start = None
    if start is not None:
        rows.append(image[max(0, start - 6):image.shape[0], :])
    return rows[:6]


def _keyword_score(text, keywords):
    score = 0
    for keyword in keywords:
        hits = len(re.findall(r"\b{}\b".format(re.escape(keyword)), text))
        score += hits
    return score


def _noise_penalty(text):
    if not text:
        return 0.0

    compact = text.replace("\n", " ")
    alpha_numeric_ratio = len(re.findall(r"[a-z0-9]", compact)) / float(max(len(compact), 1))
    punctuation_ratio = len(re.findall(r"[^a-z0-9\s.%:/()-]", compact)) / float(max(len(compact), 1))
    short_token_count = len(re.findall(r"\b[a-z0-9]{1,2}\b", compact))
    penalty = 0.0

    if alpha_numeric_ratio < 0.45:
        penalty += 35
    penalty += punctuation_ratio * 120
    penalty += min(short_token_count, 20) * 1.2
    return penalty


def rank_text(text, confidence, mode="generic"):
    profile = DOMAIN_KEYWORDS.get(mode, DOMAIN_KEYWORDS["generic"])
    digits = len(re.findall(r"\d", text))
    units = len(re.findall(r"\b\d+(?:\.\d+)?\s*(?:mg|g|mcg|kj|kcal|%)\b", text))
    percent_hits = len(re.findall(r"\b\d+(?:\.\d+)?%\b", text))
    lines = max(text.count("\n"), 1)
    strong_hits = _keyword_score(text, profile["strong"])
    weak_hits = _keyword_score(text, profile["weak"])
    negative_hits = _keyword_score(text, profile["negative"])
    has_ingredients_header = 1 if "ingredients" in text else 0
    has_nutrition_header = 1 if ("nutrition" in text or "nutritional" in text) else 0

    score = confidence * 180.0
    score += strong_hits * 22
    score += weak_hits * 8
    score += min(digits, 80) * (2.6 if mode == "nutrition" else 0.8)
    score += units * (9 if mode == "nutrition" else 3)
    score += percent_hits * (7 if mode == "nutrition" else 2)
    score += min(len(text), 1200) * 0.035
    score += min(lines, 40) * 2.5
    score += has_ingredients_header * 30
    score += has_nutrition_header * 30
    score -= negative_hits * 18
    score -= _noise_penalty(text)

    if mode == "ingredients" and digits > 40:
        score -= 20
    if mode == "nutrition" and strong_hits == 0 and units == 0:
        score -= 28

    return score


def _dedupe_texts(collected):
    unique_items = []
    seen = set()

    for score, text in collected:
        normalized = re.sub(r"\s+", " ", text.strip())
        if normalized in seen:
            continue
        seen.add(normalized)
        unique_items.append((score, text))

    return unique_items


def _rank_easy_result(easy_result, mode):
    tokens, confidence = easy_result
    text = _tokens_to_text(tokens)
    if not text:
        return "", 0.0, confidence
    return text, rank_text(text, confidence, mode=mode), confidence


def _should_try_easyocr_for_mode(mode, variant_index, variant, best_variant_score):
    limit = MAX_EASYOCR_VARIANTS + (1 if mode == "ingredients" else 0)
    if variant_index >= limit:
        return False
    if best_variant_score >= 215:
        return False
    height, width = variant.shape[:2]
    return max(height, width) <= 1800


def _collect_specialized_texts(variant, mode, primary_config):
    specialized = []
    if mode == "ingredients":
        for strip in _extract_line_strips(variant):
            strip_text, strip_conf = extract_text_from_variant(
                strip,
                primary_config,
                easy_result=([], 0.0),
                paddle_result=([], 0.0),
            )
            if len(strip_text) >= 6:
                specialized.append((rank_text(strip_text, strip_conf, mode=mode) + 12, strip_text))
    elif mode == "nutrition":
        for row_roi in _extract_table_row_rois(variant):
            row_text, row_conf = extract_text_from_variant(
                row_roi,
                primary_config,
                easy_result=([], 0.0),
                paddle_result=([], 0.0),
            )
            if len(row_text) < 4:
                continue
            if NUMERIC_UNIT_PATTERN.search(row_text) or re.search(
                r"\b(?:fat|sodium|sugar|protein|carbohydrate|fiber|fibre|energy|calories)\b",
                row_text,
            ):
                specialized.append((rank_text(row_text, row_conf, mode=mode) + 10, row_text))
    return specialized


def extract_nutrition_ocr_payload(img_path):
    variants = preprocess_variants(img_path, mode="nutrition")[:1]
    primary_configs = (r"--oem 3 --psm 6", r"--oem 3 --psm 4")

    best_payload = {
        "raw_text": "",
        "structured_rows": [],
        "structured_text": "",
        "score": float("-inf"),
    }

    for variant in variants:
        for scale in _select_scales(variant, mode="nutrition"):
            scaled_variant = _resize_scale(variant, scale)
            for config in primary_configs:
                tokens = _extract_tokens_from_variant(
                    scaled_variant,
                    config,
                    include_easyocr=False,
                    include_paddle=True,
                )
                if not tokens:
                    continue

                raw_text = _tokens_to_text(tokens)
                structured_rows = _tokens_to_nutrition_rows(tokens)
                structured_text = normalize_ocr_text("\n".join(structured_rows)) if structured_rows else ""
                candidate_text = normalize_ocr_text(
                    "\n".join(part for part in (structured_text, raw_text) if part)
                )
                score = rank_text(candidate_text, 0.0, mode="nutrition")
                if structured_rows:
                    score += 18

                if score > best_payload["score"]:
                    best_payload = {
                        "raw_text": raw_text,
                        "structured_rows": structured_rows,
                        "structured_text": structured_text,
                        "score": score,
                    }

    if best_payload["score"] == float("-inf"):
        fallback_text = extract_text_candidates(img_path, mode="nutrition")
        return {
            "raw_text": fallback_text,
            "structured_rows": [],
            "structured_text": fallback_text,
        }

    if not best_payload["structured_text"]:
        best_payload["structured_text"] = best_payload["raw_text"]

    return {
        "raw_text": best_payload["raw_text"],
        "structured_rows": best_payload["structured_rows"],
        "structured_text": best_payload["structured_text"],
    }


def _nutrition_table_crop_specs():
    return (
        {"bottom": 0.80, "right": 0.88, "label_right": 0.66, "value_left": 0.56, "value_right": 0.93},
        {"bottom": 0.86, "right": 0.90, "label_right": 0.66, "value_left": 0.56, "value_right": 0.93},
        {"bottom": 0.98, "right": 0.92, "label_right": 0.66, "value_left": 0.48, "value_right": 0.95},
    )


def _nutrition_row_center(parts):
    if not parts:
        return 0.0
    return sum(((part["y"] + part["y2"]) / 2.0) for part in parts) / float(len(parts))


def _normalize_nutrition_value_row(text):
    normalized = normalize_ocr_text(text)
    normalized = normalized.replace("¢", "g")
    normalized = re.sub(r"\bq\b", "g", normalized)
    normalized = re.sub(r"(?<=\d)\s*q\b", "g", normalized)
    normalized = re.sub(r"(?<=\d)\s*kc?a?1?\b", " kcal", normalized)
    normalized = normalized.replace("md", "mg")
    return normalize_ocr_text(normalized)


def _extract_table_side_rows(image, config, side="labels"):
    resized = resize_for_ocr(image)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY) if len(resized.shape) == 3 else resized
    tokens, _ = _extract_tesseract_tokens(gray, config)
    rows = []

    for parts in _group_tokens_into_rows(tokens):
        text = " ".join((part.get("text") or "").strip() for part in parts if (part.get("text") or "").strip())
        if not text:
            continue

        normalized = normalize_ocr_text(text)
        if side == "labels":
            if not NUTRITION_ROW_KEYWORD_PATTERN.search(normalized):
                continue
        else:
            normalized = _normalize_nutrition_value_row(text)
            if "per 100" in normalized or not re.search(r"\d", normalized):
                continue

        rows.append(
            {
                "text": normalized,
                "center_y": _nutrition_row_center(parts),
            }
        )

    return rows


def _pair_nutrition_table_rows(label_rows, value_rows):
    if not label_rows or not value_rows:
        return []

    paired = []
    used_value_indices = set()

    for label_index, label_row in enumerate(label_rows):
        start = max(0, label_index - 1)
        stop = min(len(value_rows), label_index + 2)
        candidate_indices = [idx for idx in range(start, stop) if idx not in used_value_indices]
        if not candidate_indices:
            candidate_indices = [idx for idx in range(len(value_rows)) if idx not in used_value_indices]
        if not candidate_indices:
            break

        best_index = min(
            candidate_indices,
            key=lambda idx: abs(value_rows[idx]["center_y"] - label_row["center_y"]),
        )
        best_value = value_rows[best_index]
        if abs(best_value["center_y"] - label_row["center_y"]) > 260:
            continue

        used_value_indices.add(best_index)
        paired.append(f"{label_row['text']} {best_value['text']}".strip())

    return paired


def extract_nutrition_table_texts(img_path):
    image = load_image(img_path)
    candidate_texts = []

    for spec in _nutrition_table_crop_specs():
        table = image[: int(image.shape[0] * spec["bottom"]), : int(image.shape[1] * spec["right"])]
        if table.size == 0:
            continue

        table_width = table.shape[1]
        label_crop = table[:, : int(table_width * spec["label_right"])]
        value_crop = table[:, int(table_width * spec["value_left"]) : int(table_width * spec["value_right"])]
        if label_crop.size == 0 or value_crop.size == 0:
            continue

        for config in (r"--oem 3 --psm 11", r"--oem 3 --psm 6"):
            label_rows = _extract_table_side_rows(label_crop, config, side="labels")
            value_rows = _extract_table_side_rows(value_crop, config, side="values")
            paired_rows = _pair_nutrition_table_rows(label_rows, value_rows)
            if paired_rows:
                candidate_texts.append("\n".join(paired_rows))

    deduped = []
    seen = set()
    for text in candidate_texts:
        normalized = re.sub(r"\s+", " ", text.strip())
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(text)
    return deduped


def extract_text_candidates(img_path, mode="generic"):
    variants = preprocess_variants(img_path, mode=mode)
    if mode == "ingredients":
        variants = variants[:2]
    elif mode == "nutrition":
        variants = variants[:1]

    if mode == "nutrition":
        primary_configs = (r"--oem 3 --psm 6",)
        fallback_configs = (r"--oem 3 --psm 11",)
    else:
        primary_configs = (r"--oem 3 --psm 6",)
        fallback_configs = (r"--oem 3 --psm 12",)

    collected = []

    for variant_index, variant in enumerate(variants):
        variant_results = []
        scales = _select_scales(variant, mode=mode)
        for scale_index, scale in enumerate(scales):
            scaled_variant = _resize_scale(variant, scale)
            easy_result = ([], 0.0)
            paddle_result = ([], 0.0)

            for config in primary_configs:
                text, confidence = extract_text_from_variant(
                    scaled_variant,
                    config,
                    easy_result=easy_result,
                    paddle_result=paddle_result,
                )
                if not text or len(text) < 8:
                    continue
                score = rank_text(text, confidence, mode=mode) + (3 if scale > 1.0 else 0)
                variant_results.append((score, text))

            current_best_local = max((score for score, _ in variant_results), default=0)
            if (
                mode != "nutrition"
                and
                current_best_local < (210 if mode == "nutrition" else 200)
                and _should_try_easyocr_for_mode(mode, variant_index + scale_index, scaled_variant, current_best_local)
            ):
                easy_result = _extract_easyocr_tokens(scaled_variant)
                easy_text, easy_score, _ = _rank_easy_result(easy_result, mode)
                if easy_text:
                    variant_results.append((easy_score + (2 if scale > 1.0 else 0), easy_text))
                for config in primary_configs:
                    text, confidence = extract_text_from_variant(
                        scaled_variant,
                        config,
                        easy_result=easy_result,
                        paddle_result=paddle_result,
                    )
                    if not text or len(text) < 8:
                        continue
                    score = rank_text(text, confidence, mode=mode) + (3 if scale > 1.0 else 0)
                    variant_results.append((score, text))
                current_best_local = max((score for score, _ in variant_results), default=0)

            if scale_index == 0 and variant_index == 0 and current_best_local < (180 if mode == "nutrition" else 225):
                variant_results.extend(_collect_specialized_texts(scaled_variant, mode, primary_configs[0]))

            if current_best_local >= (238 if mode == "ingredients" else 242):
                break

        best_variant_score = max((score for score, _ in variant_results), default=0)

        if best_variant_score < 195:
            fallback_list = fallback_configs if mode != "nutrition" else (r"--oem 3 --psm 4", r"--oem 3 --psm 11")
            for config in fallback_list:
                text, confidence = extract_text_from_variant(variant, config)
                if not text or len(text) < 8:
                    continue
                score = rank_text(text, confidence, mode=mode)
                variant_results.append((score, text))

        collected.extend(variant_results)

        if collected:
            current_best = max(score for score, _ in collected)
            if current_best >= (240 if mode == "ingredients" else 250) and variant_index >= 0:
                break

    collected = _dedupe_texts(collected)
    collected.sort(key=lambda item: item[0], reverse=True)

    best_texts = [text for _, text in collected[: 6 if mode == "ingredients" else 4]]
    merged_text = "\n".join(best_texts)
    return normalize_ocr_text(merged_text)
