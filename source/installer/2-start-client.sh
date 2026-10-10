#!/usr/bin/env bash
# Installs production dependencies for ../clientend and (re)starts it with pm2.
# The app must already be built (the .next folder is uploaded from your PC; the VPS never builds).
#   bash 2-start-client.sh                 # port 3000
#   PORT=8080 bash 2-start-client.sh       # custom port
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../clientend" && pwd)"
APP_NAME="${APP_NAME:-lunetbaz-client}"
PORT="${PORT:-3000}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"
nvm use default >/dev/null

cd "$APP_DIR"

if [ ! -f package.json ]; then
  echo "ERROR: $APP_DIR/package.json not found." >&2; exit 1
fi
if [ ! -f .next/BUILD_ID ]; then
  echo "ERROR: No production build in $APP_DIR/.next. Build on your PC and upload it (see DEPLOY_GUIDE.md)." >&2; exit 1
fi
if [ ! -f .env.production ]; then
  echo "WARNING: $APP_DIR/.env.production not found. Server-side env (REVALIDATE_SECRET, ...) will be missing."
fi

export NODE_ENV=production
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

echo ">> Installing production dependencies"
pnpm install --prod --frozen-lockfile

echo ">> Starting $APP_NAME on port $PORT"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
# Run next directly with node (no pnpm wrapper process) and cap memory for a 1 GB VPS.
pm2 start node_modules/next/dist/bin/next \
  --name "$APP_NAME" \
  --cwd "$APP_DIR" \
  --node-args="--max-old-space-size=512" \
  --max-memory-restart 600M \
  -- start -p "$PORT"
pm2 save

echo
echo "Running. Check it with:  pm2 status   |   pm2 logs $APP_NAME   |   curl -I http://localhost:$PORT"
