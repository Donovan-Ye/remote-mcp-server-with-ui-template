FROM node:20-alpine

# Accept proxy build arguments
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY

WORKDIR /app

# Install system dependencies including Python and build tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mcp && \
    corepack enable pnpm


# Set proxy environment variables for build
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV ALL_PROXY=${ALL_PROXY}
ENV NO_PROXY=${NO_PROXY}

# Copy all source files
COPY . .

RUN ls -al

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production

RUN pnpm db:generate && \
    pnpm build && \
    pnpm prune --prod && \
    apk del python3 make g++

# Change ownership to mcp user
RUN chown -R mcp:nodejs /app

USER mcp

EXPOSE 8788

WORKDIR /app/packages/mcp-server

CMD ["sh", "-c", "pnpm db:migrate:deploy && node dist/esm/index.js"]

