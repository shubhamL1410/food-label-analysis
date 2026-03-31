from fastapi import FastAPI, UploadFile, File
import shutil
import os

from app.nutrition_predict import predict_nutrition_from_image
from app.ingridients_predict import predict_from_image_ingridients
app = FastAPI(title="Food Label AI Service")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/predict/nutrition")
async def nutrition_api(file: UploadFile = File(...)):

    path = f"{UPLOAD_DIR}/{file.filename}"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = predict_nutrition_from_image(path)

    return result


@app.post("/predict/ingredient")
async def ingredient_api(file: UploadFile = File(...)):

    path = f"{UPLOAD_DIR}/{file.filename}"

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = predict_from_image_ingridients(path)

    return result
