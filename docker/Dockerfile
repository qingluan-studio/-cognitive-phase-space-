FROM python:3.11-slim

LABEL org.opencontainers.image.title="Cognitive Emergence Engine"
LABEL org.opencontainers.image.description="认知涌现引擎 — 质量评估与优化引擎"
LABEL org.opencontainers.image.version="1.0.0"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY src/ ./src/
COPY tests/ ./tests/

RUN pip install --no-cache-dir -e ".[all]"

EXPOSE 8899

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8899/api/v1/health').raise_for_status()" || exit 1

CMD ["cee-serve"]
