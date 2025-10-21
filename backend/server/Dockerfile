FROM node:20-alpine
RUN apk add --no-cache openssl curl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD sh -c "npx prisma migrate deploy && npm run start:dev"
