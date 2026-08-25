# ============================================================
# Facility Intelligence — Django / Celery Image
# Used by: django, celery_worker, celery_beat services
# ============================================================
FROM python:3.12-slim

# Prevents Python from writing .pyc files and buffers stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies for psycopg, Pillow, Prophet, and scipy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    libjpeg-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements/base.txt requirements/base.txt
COPY requirements/local.txt requirements/local.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements/local.txt

# Copy application code
COPY . .

EXPOSE 8000
