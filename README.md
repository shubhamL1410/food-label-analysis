# 🍱 Food Label Analysis

A smart web application that analyzes food product labels using OCR and Machine Learning to extract ingredients and nutritional information, and provides insights about the food quality.

---

## 📌 Project Overview

Food Label Analysis is designed to help users understand what they are consuming by simply uploading an image of a food label. The system extracts text using OCR and analyzes it using ML models to provide meaningful insights.

---

## 🚀 Features

- 📷 Upload food label images
- 🔍 OCR-based text extraction (Ingredients & Nutrition)
- 🧠 ML-based analysis of extracted data
- 🥗 Nutrition breakdown (Calories, Protein, Fat, etc.)
- ⚠️ Detection of harmful or unhealthy ingredients
- 📊 User-friendly visualization of results

---

## 🛠️ Tech Stack

### Frontend:
- React

### Backend:
- Spring (REST APIs)

### ML Backend
- Python(Fast API)
- ML Model(sk-learn)
- Image extraction(EasyOCR / pytesseract)

---

## 📂 Project Structure
food-label-analysis/
│
├── BE/ #backend with models, services, configs for JWT and OTP verification system
├── frontend/ # UI part
├── food_label_ai_python/ # python backend for Text extraction , getting model prediction and score with FastAPI and model which is trained
└── README.md


## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

git clone https://github.com/ShubhamL1410/food-label-analysis.git  
cd food-label-analysis

---

## 🔧 2️⃣ Python Backend (FastAPI + ML + OCR)

This backend handles:
- OCR (text extraction)
- ML model prediction (.pkl)
- Food label analysis

### Setup Steps:

cd backend  
pip install -r requirements.txt  

# Run FastAPI server
uvicorn main:app --reload

---

## ☕ 3️⃣ Spring Boot Backend (Security + OTP + Chat)

This backend handles:
- User authentication & security
- OTP verification
- Chat storage & user data management

### Setup Steps:

cd spring-api  

# Using Maven
mvn clean install  

# Run the application
mvn spring-boot:run  

OR run from your IDE (IntelliJ / STS)

---

## 🌐 4️⃣ Frontend Setup

### Setup Steps:

cd frontend  
npm install  
npm run dev  

---

## 🔗 5️⃣ Important Notes

- Make sure both backends are running before starting frontend  
- Configure API URLs properly in frontend (FastAPI + Spring Boot)  
- Ensure ML model (.pkl file) is placed correctly in backend  
- Add your `.env` file if required (not included in repo)

---

## 🧪 How It Works

1. User uploads an image of a food label  
2. OCR extracts text from the image  
3. Extracted text is processed  
4. ML model analyzes ingredients and nutrition  
5. Results are displayed to the user  

---

## ⚠️ Current Limitations

- OCR accuracy depends on image quality  
- Complex labels may not be fully detected  
- Text extraction still needs improvement  

---

## 🔮 Future Improvements

- Improve OCR accuracy  
- Add real-time scanning  
- Better ML model for ingredient classification  
- Mobile app version  
- Barcode scanning integration  

---

## 👨‍💻 Contributors

- Koyani Gaurav P.
- Lathiya Shubham D.

---

## 📄 License

This project is for educational purposes.

---

## ⭐ Acknowledgement

This project was developed as part of learning and exploring Machine Learning, OCR, and Full Stack Development.
