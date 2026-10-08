# Use slim Python 3.11 image
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p logs tmp/plant_doctor_output && \
    chown -R user:user /app && \
    chmod -R 777 /app

USER user

EXPOSE 7860

CMD ["sh", "-c", "uvicorn ai_api.api:app --host 0.0.0.0 --port ${PORT:-7860}"]
