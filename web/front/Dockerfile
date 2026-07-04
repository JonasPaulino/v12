FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_ACBR_API_URL=/acbr

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ACBR_API_URL=$VITE_ACBR_API_URL

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
