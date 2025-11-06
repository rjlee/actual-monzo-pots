FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

ENV HUSKY=0
ENV PYTHON=/usr/bin/python3
ENV npm_config_python=/usr/bin/python3

# Install JS dependencies (production only); allow overriding @actual-app/api
ARG ACTUAL_API_VERSION
ARG GIT_SHA
ARG APP_VERSION
COPY package*.json ./
RUN npm pkg delete scripts.prepare || true && \
    if [ -n "$ACTUAL_API_VERSION" ]; then \
      npm pkg set dependencies.@actual-app/api=$ACTUAL_API_VERSION && \
      npm install --package-lock-only --no-audit --no-fund; \
    fi && \
    npm ci --omit=dev --no-audit --no-fund

# Copy application source
COPY . .

FROM node:22-slim AS runner

WORKDIR /app

# Copy application and dependencies from build stage
COPY --from=builder /app /app

# Useful metadata labels
ARG ACTUAL_API_VERSION
ARG GIT_SHA
ARG APP_VERSION
LABEL org.opencontainers.image.revision="$GIT_SHA" \
      org.opencontainers.image.version="$APP_VERSION" \
      io.actual.api.version="$ACTUAL_API_VERSION"

RUN chmod +x /app/bin/healthcheck.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD /app/bin/healthcheck.sh

ENTRYPOINT ["node", "src/index.js"]
CMD ["--mode", "daemon"]
