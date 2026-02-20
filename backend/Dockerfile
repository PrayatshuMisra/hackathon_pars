# PARS Backend - FastAPI Dockerfile
# Optimized for Railway deployment with 1GB RAM instances

FROM python:3.11-slim

# Set environment variables to prevent Python from buffering output
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Reduce TensorFlow memory usage
ENV TF_CPP_MIN_LOG_LEVEL=2
ENV TF_ENABLE_ONEDNN_OPTS=0
ENV OMP_NUM_THREADS=1
ENV TF_NUM_INTEROP_THREADS=1
ENV TF_NUM_INTRAOP_THREADS=1

WORKDIR /app

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all backend files
COPY . .

# Expose port (Railway injects $PORT automatically)
EXPOSE 8000

# Start the FastAPI server
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
