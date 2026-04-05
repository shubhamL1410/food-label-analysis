# ── Base image ──────────────────────────────────────────────────
FROM python:3.11-slim

# ── Set working directory ───────────────────────────────────────
WORKDIR /app

# ── Install system dependencies ─────────────────────────────────
# Tesseract OCR + OpenCV + EasyOCR all need these system libs
RUN apt-get update && apt-get install -y \
    # Tesseract OCR binary
    tesseract-ocr \
    tesseract-ocr-eng \
    # OpenCV dependencies
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    # EasyOCR / PyTorch dependencies
    libgomp1 \
    # General utilities
    wget \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Upgrade pip ─────────────────────────────────────────────────
RUN pip install --no-cache-dir --upgrade pip

# ── Install Python dependencies ─────────────────────────────────
# Copy requirements first (Docker layer cache — only rebuilds if requirements change)
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ── Copy project files ──────────────────────────────────────────
COPY . .

# ── Create uploads directory at runtime ─────────────────────────
RUN mkdir -p uploads

# ── Expose FastAPI port ─────────────────────────────────────────
EXPOSE 8000

# ── Start server ────────────────────────────────────────────────
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
