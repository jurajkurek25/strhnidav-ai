#!/usr/bin/env bash
# Nasadenie novej verzie na server: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

if [ "$(id -u)" -eq 0 ]; then
  echo "Nespúšťaj ako root. Použi: su - strhnidav-ai -c 'cd htdocs/ai.strhnidav.sk && ./deploy.sh'" >&2
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "Chýba .env.local – skopíruj .env.example a vyplň hodnoty." >&2
  exit 1
fi

BRANCH="${BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

git pull --ff-only origin "$BRANCH"
npm ci
npm run build

if pm2 describe strhnidav-ai > /dev/null 2>&1; then
  # Znova načíta ecosystem.config.cjs (napr. zmenený PORT)
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
  pm2 save
fi

echo "Nasadené: $(git log --oneline -1)"
