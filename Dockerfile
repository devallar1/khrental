FROM node:22-alpine3.22

WORKDIR /app

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PORT=5174
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm install --include=dev --no-audit --no-fund --force

COPY . .

# Better-Auth init runs at build time (SvelteKit's analyse step imports
# src/lib/server/auth.ts). Pass the secret + URL as build args so the build
# can complete; runtime values come from .env.docker via env_file.
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG PUBLIC_MAPTILER_KEY
ARG PG_HOST=postgres
ARG PG_PORT=5432
ARG PG_DATABASE
ARG PG_USER
ARG PG_PASSWORD
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV PUBLIC_MAPTILER_KEY=$PUBLIC_MAPTILER_KEY
ENV PG_HOST=$PG_HOST
ENV PG_PORT=$PG_PORT
ENV PG_DATABASE=$PG_DATABASE
ENV PG_USER=$PG_USER
ENV PG_PASSWORD=$PG_PASSWORD

RUN npm run build

ENV NODE_ENV=production

RUN mkdir -p /app/public/storage \
  && chmod +x /app/docker/docker-entrypoint.sh

EXPOSE 5174

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5174) + '/api/health').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "/app/docker/docker-entrypoint.sh"]
