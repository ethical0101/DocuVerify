# syntax=docker/dockerfile:1

# --- Stage 1: build the frontend (static assets served by the backend) ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend runtime, serving the built frontend as one process ---
FROM python:3.11-slim AS backend

# opencv-python-headless needs libgl1/libglib2.0-0 at runtime; pdf2image
# needs the poppler-utils CLI (pdftoppm) to rasterize PDF uploads.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install CPU-only PyTorch first, from PyTorch's own CPU wheel index --
# easyocr's default resolution otherwise pulls PyPI's CUDA-enabled torch
# build (several GB of nvidia-*/cuda-toolkit/triton packages this instance
# has no GPU to use). Satisfying the constraint here means pip won't touch
# torch again when it installs requirements.txt below.
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision

COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend/ backend/
COPY ml/ ml/
COPY --from=frontend-build /app/frontend/dist frontend/dist

# Pre-download EasyOCR's CRAFT/CRNN weights at build time so the first
# request in production doesn't stall on a cold model download.
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

# Runtime data (SQLite DB, uploads, enterprise datasets, JWT secret) --
# mount a persistent volume here in production or it resets on redeploy.
VOLUME ["/app/data"]

EXPOSE 8000
CMD ["sh", "-c", "cd backend && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
