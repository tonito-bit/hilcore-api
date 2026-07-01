FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma generate && node_modules/.bin/prisma migrate deploy && node_modules/.bin/ts-node --transpile-only -r tsconfig-paths/register src/main.ts"]
