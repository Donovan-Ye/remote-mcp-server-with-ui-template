FROM node:20-alpine

WORKDIR /app

# Install system dependencies including Python and build tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 mcp && \
    corepack enable pnpm

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

CMD ['pnpm','db:migrate:deploy']
CMD ["node", "dist/esm/index.js"]

