#!/bin/sh
# Runs as root just long enough to make the (possibly volume-mounted)
# STORAGE_ROOT writable by the unprivileged nextjs user, then drops
# privileges and starts the server.
set -e

STORAGE_ROOT="${STORAGE_ROOT:-/app/public}"

echo "[entrypoint] STORAGE_ROOT=$STORAGE_ROOT"
echo "[entrypoint] mount info for $STORAGE_ROOT:"
mount | grep -E " ${STORAGE_ROOT}( |/| type)" || echo "[entrypoint]   (no separate mount found at $STORAGE_ROOT)"
echo "[entrypoint] df -h $STORAGE_ROOT:"
df -h "$STORAGE_ROOT" 2>&1 || true
echo "[entrypoint] existing contents:"
ls -la "$STORAGE_ROOT" 2>&1 || true

mkdir -p "$STORAGE_ROOT/uploads"
chown -R nextjs:nodejs "$STORAGE_ROOT/uploads"

# Persistent marker — should survive across deploys if the volume is real.
date -u +"%Y-%m-%dT%H:%M:%SZ deploy=${RAILWAY_DEPLOYMENT_ID:-?}" \
  >> "$STORAGE_ROOT/uploads/.entrypoint-history.log"
echo "[entrypoint] last 5 entrypoint visits recorded on volume:"
tail -n 5 "$STORAGE_ROOT/uploads/.entrypoint-history.log" 2>&1 || true

exec su-exec nextjs:nodejs sh -c \
  "node node_modules/prisma/build/index.js migrate deploy && node server.js"
