FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY frontend/package.json frontend/package-lock.json frontend/
WORKDIR /app/frontend
RUN npm ci

COPY frontend /app/frontend
RUN npm run build

COPY backend /app/backend
WORKDIR /app/backend

ENV PORT=8000
EXPOSE 8000

CMD python seed.py && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
