#!/usr/bin/env bash
# Nasadenie novej verzie na server: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

if [ ! -f .env.local ]; then
  echo "Chýba .env.local – skopíruj .env.example a vyplň hodnoty." >&2
  exit 1
fi

git pull --ff-only origin "$BRANCH"
npm ci
npm run build

if pm2 describe strhnidav-ai > /dev/null 2>&1; then
  pm2 reload strhnidav-ai
else
  pm2 start ecosystem.config.cjs
  pm2 save
fi

echo "Nasadené: $(git log --oneline -1)"
