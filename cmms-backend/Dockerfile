# Install dependencies only when needed
FROM node:16.15.0-alpine3.14 AS deps

ARG SSH_PRIVATE_KEY

RUN \
    echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories \
    && apk update && apk upgrade \
    && apk add bash build-base libxml2-dev libxslt-dev openssh-client git \
    && apk upgrade --available \
    && rm -rf /var/cache/apk/* \
    && mkdir /usr/app \
    mkdir /root/.ssh/ \
    && echo "${SSH_PRIVATE_KEY}" > /root/.ssh/id_rsa \
    && eval $(ssh-agent -s) \
    && chmod 600 /root/.ssh/id_rsa \
    && ssh-add ~/.ssh/id_rsa \
    && touch /root/.ssh/known_hosts \
    && ssh-keyscan bitbucket.org > /root/.ssh/known_hosts

RUN npm install -g @nestjs/cli

RUN nest --version

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./
COPY . .

RUN apk add --no-cache git openssh

RUN yarn

# Rebuild the source code only when needed
FROM node:16.15.0-alpine3.14 AS builder

WORKDIR /usr/src/app

RUN npm install -g @nestjs/cli

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

RUN yarn build

# Production image, copy all the files and run next
FROM node:16.15.0-alpine3.14 AS runner

WORKDIR /usr/src/app

EXPOSE 3000

ENV PORT 3000

COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/ormconfig.js ./ormconfig.js

CMD [ "yarn","start:prod" ]
