# Multi-stage production build for Aura Audio Player
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production runtime image with Python and ffmpeg
FROM node:22-alpine

WORKDIR /app

# Install ffmpeg and python3 for yt-dlp audio extraction
RUN apk add --no-cache ffmpeg python3 py3-pip && \
    python3 -m venv /app/.venv && \
    /app/.venv/bin/pip install --no-cache-dir yt-dlp

COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets and server code
COPY --from=builder /app/dist ./dist
COPY server/ ./server/
COPY server.js ./

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["node", "server.js"]
