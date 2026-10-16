#!/usr/bin/env bash
# Example production deploy script — adjust paths, domain, and service name for your host.
#
# Typical flow: back up SQLite → pull → install → schema push → build → restart.
#
# Set before running:
#   PROJECT_DIR   — checkout path on the server
#   SERVICE_NAME  — systemd unit name (without .service)
#   PUBLIC_URL    — for the success message only
#
set -euo pipefail

DB_BACKUPS_KEPT="${DB_BACKUPS_KEPT:-5}"
PROJECT_DIR="${PROJECT_DIR:-/var/www/roadtrip-planner}"
SERVICE_NAME="${SERVICE_NAME:-roadtrip-planner}"
PUBLIC_URL="${PUBLIC_URL:-https://your-domain.example}"

main() {
  cd "$PROJECT_DIR"

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  echo "=== Backing up DB ==="
  cp -n prisma/dev.db "prisma/dev.db.bak-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

  ls -1 prisma/dev.db.bak-[0-9]* 2>/dev/null \
    | sort -r | tail -n +$((DB_BACKUPS_KEPT + 1)) \
    | while read -r old; do echo "  pruning $old"; rm -f "$old"; done

  echo "=== Pulling latest main ==="
  git pull origin main

  echo "=== Installing dependencies ==="
  npm install

  echo "=== Syncing DB schema ==="
  npx prisma db push

  echo "=== Building ==="
  npm run build

  echo "=== Restarting service ==="
  sudo systemctl restart "$SERVICE_NAME"

  echo ""
  echo "Done. Live at $PUBLIC_URL"
}

main "$@"
