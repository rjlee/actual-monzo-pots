FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (if any)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install JS dependencies (production only); allow overriding @actual-app/api
ARG ACTUAL_API_VERSION
ARG GIT_SHA
ARG APP_VERSION
COPY package*.json ./
RUN if [ -n "$ACTUAL_API_VERSION" ]; then \
      npm pkg set dependencies.@actual-app/api=$ACTUAL_API_VERSION && \
      npm install --package-lock-only; \
    fi && \
    npm ci --omit=dev

# Copy application source
COPY . .

FROM node:20-bullseye-slim AS runner

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

# Default command: run the cron-based daemon
CMD ["npm", "run", "daemon"]
