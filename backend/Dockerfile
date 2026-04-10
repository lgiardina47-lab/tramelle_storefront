# Medusa API — Node 20 Alpine
FROM node:20-alpine

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

ENV NODE_ENV=production
ENV PORT=9000

EXPOSE 9000

CMD ["yarn", "start"]
