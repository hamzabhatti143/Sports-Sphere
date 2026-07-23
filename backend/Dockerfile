# SportSpot backend (FastAPI). Dependencies are installed with `uv` into an
# in-container virtual environment (.venv), rebuilt fresh on every image build.
FROM python:3.12-slim

# uv — fast Python package manager (copied from the official image).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

# Install dependencies first so this layer is cached unless requirements change.
COPY requirements.txt ./
RUN uv venv "$VIRTUAL_ENV" \
    && uv pip install --no-cache -r requirements.txt

# Application source (secrets are injected via env vars at runtime, never baked in).
COPY . .

EXPOSE 8000

# Run migrations optionally at startup, then serve. Env (DATABASE_URL, SECRET_KEY,
# BOT_URL, BOT_ADMIN_TOKEN, HOLD_MINUTES, …) must be provided at runtime.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
