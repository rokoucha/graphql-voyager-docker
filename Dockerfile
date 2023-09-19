FROM node:20-bookworm as deps

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile --production


FROM deps as builder

RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml /app/
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY index.ts ./

RUN pnpm run build


FROM node:20-bookworm-slim

ENV TINI_VERSION v0.19.0

ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-static /tini

RUN chmod +x /tini

ENV NODE_ENV production

WORKDIR /app

USER node

COPY --chown=node:node /package.json /app/package.json
COPY --from=deps --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/dist/index.js /app/index.js

ENV PORT=3000
EXPOSE 3000

ENV BASE_PATH=/app/schemas

ENTRYPOINT [ "/tini", "--", "/usr/local/bin/node", "/app/index.js" ]
