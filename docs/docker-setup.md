# Docker Setup

## Overview

This project can run in Docker with:

- one `web` container for the application
- one `postgres` container for the database
- a mounted Docker volume for `/app/public/storage`

The app container uses a pinned Alpine-based Node image (`node:22-alpine3.22`). The database uses `postgres:16-alpine`.

## Files

- [Dockerfile](../Dockerfile)
- [docker-compose.yml](../docker-compose.yml)
- [.dockerignore](../.dockerignore)
- [.env.docker.example](../.env.docker.example)
- [docker/docker-entrypoint.sh](../docker/docker-entrypoint.sh)
- [docker/init-db.mjs](../docker/init-db.mjs)

## Prerequisites

- Docker Desktop running
- Docker Compose available

## Quick Start

### 1. Create the Docker env file

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` to change the database password or add optional integrations (SendGrid, Evia Sign).

### 2. Build and start the containers

```bash
docker compose up --build
```

On first run, the entrypoint script will:
- Generate the browser env config (`public/env-config.js`)
- Wait for PostgreSQL to be ready
- Run all database migrations automatically
- Start the Express server

### 3. Open the application

Visit: `http://localhost:5174`

### 4. Stop the containers

```bash
docker compose down
```

To also remove volumes (database data and uploaded files):

```bash
docker compose down -v
```

## Services

### `web`

- Starts the KH Rentals server
- Generates browser env config on startup
- Runs database migrations on startup
- Exposes the app on port `5174`

### `postgres`

- Runs PostgreSQL 16 (Alpine)
- Exposes port `5432`
- Persists database files in a Docker volume
- Health check ensures the database is ready before the web container starts

## Environment Variables

Key variables used by the app container:

- `PORT`
- `PG_HOST`
- `PG_PORT`
- `PG_DATABASE`
- `PG_USER`
- `PG_PASSWORD`
- `DATABASE_URL` (alternative to individual PG_* variables)
- `VITE_API_ENDPOINT`
- `VITE_APP_BASE_URL`
- `VITE_USE_MSSQL_API`

Optional integration variables:

- `EVIA_SIGN_CLIENT_ID`
- `EVIA_SIGN_CLIENT_SECRET`
- `SENDGRID_API_KEY` or `TWILIO_SENDGRID_API_KEY`
- `DEFAULT_FROM_EMAIL`
- `DEFAULT_FROM_NAME`

## Storage

The compose setup uses a named Docker volume for:

- `/app/public/storage`

This keeps uploaded files outside the container filesystem so they survive container recreation.

## Database Migrations

Migrations run automatically on container startup via `docker/init-db.mjs`. The script:

1. Waits for PostgreSQL to accept connections
2. Creates the `pgcrypto` extension for UUID generation
3. Creates a `_migrations` tracking table
4. Runs all `2026*.sql` files from `src/db/migrations/` that haven't been applied yet

Migrations are idempotent — restarting the container won't re-run already-applied migrations.

## Troubleshooting

### Port conflicts
If `5174` or `5432` is already in use, update the compose port mapping or set `WEB_PORT` / `PG_HOST_PORT` in your environment.

### Login or API issues
Check container logs:

```bash
docker compose logs web
docker compose logs postgres
```

### Rebuild after dependency changes
If `package.json` changes, rebuild:

```bash
docker compose up --build
```

### Reset database
To start fresh:

```bash
docker compose down -v
docker compose up --build
```
