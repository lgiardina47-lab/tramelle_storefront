# Admin panel — build con Vite, serve statico con `serve` sulla porta 8000 (host: 7000→8000).
# Contesto = root monorepo (docker-compose) per `../deploy` e `../backend` in vite.config.mts.
FROM node:24-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /srv

COPY deploy/monorepo-default-ports.cjs deploy/monorepo-default-ports.cjs
COPY backend ./backend
COPY admin-panel/package.json admin-panel/yarn.lock ./admin-panel/

WORKDIR /srv/admin-panel
RUN yarn install --frozen-lockfile

COPY admin-panel/ .

ARG VITE_MEDUSA_BASE=/
ARG VITE_MEDUSA_BACKEND_URL=https://api.tramelle.com
ARG VITE_MEDUSA_STOREFRONT_URL=https://tramelle.com
ARG VITE_MEDUSA_B2B_PANEL=true
ARG VITE_TRAMELLE_CDN_PUBLIC_BASE=https://cdn.tramelle.com

ENV VITE_MEDUSA_BASE=$VITE_MEDUSA_BASE \
    VITE_MEDUSA_BACKEND_URL=$VITE_MEDUSA_BACKEND_URL \
    VITE_MEDUSA_STOREFRONT_URL=$VITE_MEDUSA_STOREFRONT_URL \
    VITE_MEDUSA_B2B_PANEL=$VITE_MEDUSA_B2B_PANEL \
    VITE_TRAMELLE_CDN_PUBLIC_BASE=$VITE_TRAMELLE_CDN_PUBLIC_BASE

RUN yarn build:preview

FROM node:24-alpine AS runtime
RUN npm install -g serve
COPY --from=build /srv/admin-panel/dist /app
WORKDIR /app
EXPOSE 8000
CMD ["serve", "-s", ".", "-l", "8000"]
