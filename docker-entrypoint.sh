#!/bin/sh
# Runs as root just long enough to make the (possibly volume-mounted)
# STORAGE_ROOT writable by the unprivileged nextjs user, then drops
# privileges and starts the server.
set -e

STORAGE_ROOT="${STORAGE_ROOT:-/app/public}"
mkdir -p "$STORAGE_ROOT/uploads"
chown -R nextjs:nodejs "$STORAGE_ROOT/uploads"

exec su-exec nextjs:nodejs sh -c \
  "node node_modules/prisma/build/index.js migrate deploy && node server.js"
