FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
# ⚡ TỐI ƯU: Khóa giới hạn RAM ở mức 512MB để ngăn chặn Out Of Memory (OOM Killer) làm sập Server khi build
ENV NODE_OPTIONS="--max_old_space_size=512"
RUN yarn build


FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production


COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
