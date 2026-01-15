# Dockerfile for Hand Gesture Recognition API
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies for building numpy/scikit-learn and healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Docker-specific requirements and install Python dependencies
COPY requirements_docker.txt requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Expose port
EXPOSE 5000

# Run with gunicorn (workers and threads configurable via env vars)
# Default: 1 worker, 2 threads (optimized for Free Tier)
# Override with GUNICORN_WORKERS and GUNICORN_THREADS env vars
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:5000 --workers ${GUNICORN_WORKERS:-1} --threads ${GUNICORN_THREADS:-2} --timeout 120 app:app"]

