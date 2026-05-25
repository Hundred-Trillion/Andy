FROM python:3.11-slim

WORKDIR /app

# System deps for CadQuery
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0t64 libxrender1 libxext6 && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip first
RUN pip install --upgrade pip

# Install deps
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 300 --retries 3 -r requirements.txt

COPY . .
RUN mkdir -p /app/generated

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
