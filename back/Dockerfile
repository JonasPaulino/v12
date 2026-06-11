FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "sh ./scripts/run_migrations.sh && node index.js"]
