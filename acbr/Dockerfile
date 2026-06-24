FROM node:20-bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  xvfb \
  xauth \
  openssl \
  libxml2 \
  libgtk2.0-0 \
  ca-certificates \
  fonts-liberation \
  && rm -rf /var/lib/apt/lists/* \
  && if [ ! -e /usr/lib/libxml2.so ] && [ -e /usr/lib/x86_64-linux-gnu/libxml2.so.2 ]; then ln -s /usr/lib/x86_64-linux-gnu/libxml2.so.2 /usr/lib/libxml2.so; fi \
  && if [ ! -e /usr/lib/libssl.so ] && [ -e /usr/lib/x86_64-linux-gnu/libssl.so.3 ]; then ln -s /usr/lib/x86_64-linux-gnu/libssl.so.3 /usr/lib/libssl.so; fi \
  && if [ ! -e /usr/lib/libcrypto.so ] && [ -e /usr/lib/x86_64-linux-gnu/libcrypto.so.3 ]; then ln -s /usr/lib/x86_64-linux-gnu/libcrypto.so.3 /usr/lib/libcrypto.so; fi

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4100

CMD ["npm", "start"]
