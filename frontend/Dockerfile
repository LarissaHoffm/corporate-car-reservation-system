FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci

# Copia o restante do código
COPY . .

# Build de produção
RUN npm run build

# Vite preview vai servir o build (dist) na porta 5173
EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
