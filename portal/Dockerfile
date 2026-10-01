# Build 100% offline: dependências vendorizadas em wheels/ (ver requirements*.txt).
ARG IMAGEM_PYTHON=python:3.12-slim@sha256:f77ac9e44ae96ef2c90b8053ea08c31f8be030f824196b0ae4db6d462c84e51f

FROM ${IMAGEM_PYTHON} AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_INDEX=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY wheels /wheels
COPY requirements.txt requirements-test.txt ./

FROM base AS runtime
RUN pip install --no-cache-dir --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels \
    && useradd --system --uid 10001 --no-create-home portal
COPY app ./app
COPY migrations ./migrations
USER portal
EXPOSE 8000
CMD ["uvicorn", "app.principal:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]

FROM base AS teste
RUN pip install --no-cache-dir --find-links=/wheels -r requirements-test.txt \
    && rm -rf /wheels
COPY pyproject.toml ./
COPY app ./app
COPY migrations ./migrations
COPY testes ./testes
CMD ["pytest", "-v"]
