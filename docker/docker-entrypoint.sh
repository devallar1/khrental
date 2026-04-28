#!/bin/sh
set -e

echo "[entrypoint] Initializing database..."
node docker/init-db.mjs

echo "[entrypoint] Starting SvelteKit server..."
exec node build/index.js
