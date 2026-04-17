FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ARG REACT_APP_BASE_URL
ENV REACT_APP_BASE_URL=${REACT_APP_BASE_URL}

# ⚡ TỐI ƯU: Khóa giới hạn RAM ở mức 512MB để ngăn chặn Out Of Memory (OOM Killer) làm sập Server khi build
ENV NODE_OPTIONS="--max_old_space_size=512"

RUN yarn build


FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
