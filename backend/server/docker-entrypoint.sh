#!/bin/sh
set -e

echo "🟦 [entrypoint] NODE_ENV=${NODE_ENV:-development}"

# 0) Garante que o binário local (./node_modules/.bin) está no PATH
export PATH="/app/node_modules/.bin:$PATH"

# 1) Se o volume node_modules estiver vazio (caso dev), instala dependências
if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "🟨 [entrypoint] node_modules vazio — executando npm ci..."
  npm ci
else
  echo "🟩 [entrypoint] node_modules já presente — pulando npm ci"
fi

# 2) Prisma (gera client, aplica migrations, roda seed) — idempotente
echo "🟦 [entrypoint] prisma generate"
npx prisma generate >/dev/null 2>&1 || true

echo "🟦 [entrypoint] prisma migrate deploy"
npx prisma migrate deploy

echo "🟦 [entrypoint] prisma db seed"
npx prisma db seed || echo "⚠️  [entrypoint] seed retornou código não-zero — seguindo em frente"

# 3) Sobe a aplicação conforme ambiente
if [ "${NODE_ENV:-development}" = "development" ]; then
  echo "🟩 [entrypoint] iniciando Nest em modo desenvolvimento..."
  # Garante que o CLI do Nest está acessível (vem das devDeps instaladas pelo npm ci)
  if ! command -v nest >/dev/null 2>&1; then
    echo "🟨 [entrypoint] nest CLI não encontrado — (re)instalando devDeps..."
    npm ci
  fi
  exec npm run start:dev
else
  echo "🟩 [entrypoint] iniciando Nest em modo produção..."
  if [ -f dist/main.js ]; then
    exec node dist/main.js
  elif [ -f dist/src/main.js ]; then
    exec node dist/src/main.js
  else
    echo "⚠️  [entrypoint] dist/ não encontrado; executando build..."
    npm run build
    # tenta de novo
    if [ -f dist/main.js ]; then
      exec node dist/main.js
    elif [ -f dist/src/main.js ]; then
      exec node dist/src/main.js
    else
      echo "❌ [entrypoint] build não gerou main.js — verifique configuração de build"
      exit 1
    fi
  fi
fi
