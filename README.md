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
- HTML, CSS, JavaScript
- (React / Vue if used)

### Backend:
- Python (Flask / FastAPI)
- OCR (Tesseract / EasyOCR)
- Machine Learning (Scikit-learn / Custom Model)

### Additional:
- Image Processing
- REST APIs

---

## 📂 Project Structure
food-label-analysis/
│
├── backend/ # Python backend (OCR + ML)
├── frontend/ # UI part
├── spring-api/ # (Optional Java backend if used)
├── dataset/ # Training data (not uploaded)
├── models/ # Trained models (ignored in git)
└── README.md


## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

git clone https://github.com/your-username/food-label-analysis.git  
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