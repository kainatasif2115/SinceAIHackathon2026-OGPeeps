# Django API for Cloud Run. Build from the repo root, because the backend reads the
# organisers' SimSet at runtime:
#   docker build -f backend/Dockerfile -t ogpeeps-backend .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    DJANGO_DEBUG=false

WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY simset simset
# Evaluator output for the staff console's Results, Cases and Twins tabs.
COPY results results
COPY backend backend

RUN useradd --system --create-home app
USER app
WORKDIR /app/backend

# One process with threads: the brain spends its time waiting on ElevenLabs, and
# Cloud Run sets its own request timeout, so gunicorn's is switched off.
CMD exec gunicorn config.wsgi:application --bind ":$PORT" --workers 1 --threads 8 --timeout 0
