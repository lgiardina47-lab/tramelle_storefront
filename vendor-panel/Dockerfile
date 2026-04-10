# Vendor panel — build with Vite, serve with `npm run preview` (port 5173)
# Build context must be the monorepo root (see docker-compose) so ../deploy resolves for vite.config.mts.
FROM node:20-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /srv

COPY deploy/monorepo-default-ports.cjs deploy/monorepo-default-ports.cjs
COPY vendor-panel/package.json vendor-panel/yarn.lock ./vendor-panel/

WORKDIR /srv/vendor-panel
RUN yarn install --frozen-lockfile

COPY vendor-panel/ .

ARG VITE_MEDUSA_BACKEND_URL=https://api.tramelle.com
ARG VITE_MEDUSA_STOREFRONT_URL=https://tramelle.com
ARG VITE_MEDUSA_BASE=/
ARG VITE_PUBLISHABLE_API_KEY=
ARG VITE_TRAMELLE_CDN_PUBLIC_BASE=https://cdn.tramelle.com

ENV VITE_MEDUSA_BACKEND_URL=${VITE_MEDUSA_BACKEND_URL}
ENV VITE_MEDUSA_STOREFRONT_URL=${VITE_MEDUSA_STOREFRONT_URL}
ENV VITE_MEDUSA_BASE=${VITE_MEDUSA_BASE}
ENV VITE_PUBLISHABLE_API_KEY=${VITE_PUBLISHABLE_API_KEY}
ENV VITE_TRAMELLE_CDN_PUBLIC_BASE=${VITE_TRAMELLE_CDN_PUBLIC_BASE}

RUN yarn build

ENV NODE_ENV=production
ENV PORT=5173
EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
