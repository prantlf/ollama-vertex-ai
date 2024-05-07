FROM oven/bun:1-alpine as base

RUN apk update && apk upgrade --no-cache

WORKDIR /usr/src/app

FROM base AS install

RUN mkdir -p /tmp/dev /tmp/prod
COPY package.json yarn.lock /tmp/dev/
COPY package.json yarn.lock /tmp/prod/
RUN cd /tmp/dev && bun i --frozen-lockfile && \
  cd ../prod && bun i --frozen-lockfile --production

FROM base AS build

COPY --from=install /tmp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build && bun run test

FROM base AS release

COPY --from=install /tmp/prod/node_modules node_modules
COPY --from=build /usr/src/app/dist dist
COPY --from=build /usr/src/app/package.json .

ARG DEBUG=ovai,ovai:srv
ENV DEBUG=$DEBUG

USER bun
EXPOSE 22434/tcp
ENTRYPOINT [ "bun", "run", "dist/ollama-vertex-ai.js" ]

HEALTHCHECK --interval=5m \
  CMD curl -f http://localhost:22434/ping || exit 1
