# ========= STAGE 1: BUILDER =========
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Instala dependências (inclui dev para permitir build)
COPY package*.json ./
RUN npm ci

# Copia o código e configs
COPY . .

# Gera Prisma Client (necessário no build)
RUN npx prisma generate

# Build do Nest → gera dist/
RUN npm run build

# ========= STAGE 2: RUNTIME =========
FROM node:20-alpine AS runtime
# 👇 Precisamos do curl para o healthcheck do docker-compose (dev)
RUN apk add --no-cache openssl curl
WORKDIR /app

# Instala TODAS as dependências (mantém devDeps disponíveis para start:dev)
COPY package*.json ./
RUN npm ci

# Copia artefatos necessários para runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist   ./dist
# Fallback TS (dev)
COPY --from=builder /app/src                 ./src
COPY --from=builder /app/tsconfig.json       ./tsconfig.json
COPY --from=builder /app/tsconfig.build.json ./tsconfig.build.json

# Gera Prisma Client no runtime (garante engines corretas)
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
