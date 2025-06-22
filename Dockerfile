FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (if any)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install JS dependencies (omit dev dependencies for a lean build)
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

FROM node:20-bullseye-slim AS runner

WORKDIR /app

# Copy application and dependencies from build stage
COPY --from=builder /app /app

# Default command: run the cron-based daemon
CMD ["npm", "run", "daemon"]