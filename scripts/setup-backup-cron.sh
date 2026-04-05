#!/usr/bin/env bash
# Install a periodic backup cron job for the Parrot MySQL database.
#
# Environment variables (all optional, values below are defaults):
#   PROJECT_DIR             path to the project root (auto-detected)
#   BACKUP_SCHEDULE         cron expression          (0 3 * * *)
#   BACKUP_RETENTION_DAYS   days of backups to keep  (7)
#   COMPOSE_FILE            compose file to use      (docker-compose.yml)
#   ENV_FILE                env file to load         (.env)
#   EXTRA_ENV_FILE          additional env file      ("")
#
# Usage (local dev):
#   bash scripts/setup-backup-cron.sh
#
# Usage (production – called via "make remote-setup-backup-cron"):
#   COMPOSE_FILE=docker-compose.deploy.yml \
#   EXTRA_ENV_FILE=.release.env \
#   bash scripts/setup-backup-cron.sh

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 3 * * *}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
EXTRA_ENV_FILE="${EXTRA_ENV_FILE:-}"

# Load database name from .env so the cron command is concrete.
if [[ -f "${PROJECT_DIR}/${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  DATABASE_NAME="$(grep -E '^MYSQL_DATABASE=' "${PROJECT_DIR}/${ENV_FILE}" | cut -d= -f2 | tr -d '[:space:]')"
fi
DATABASE_NAME="${DATABASE_NAME:-parrot}"

BACKUP_DIR="${PROJECT_DIR}/backups/mysql"

CRON_MARKER="parrot-db-backup"

extra_env_arg=""
if [[ -n "${EXTRA_ENV_FILE}" ]]; then
  extra_env_arg="EXTRA_ENV_FILE=${EXTRA_ENV_FILE} "
fi

CRON_CMD="${BACKUP_SCHEDULE} cd ${PROJECT_DIR} && ENV_FILE=${ENV_FILE} ${extra_env_arg}COMPOSE_FILE=${COMPOSE_FILE} BACKUP_DIR=${BACKUP_DIR} DATABASE_NAME=${DATABASE_NAME} BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS} bash scripts/mysql-backup.sh >> /tmp/${CRON_MARKER}.log 2>&1 # ${CRON_MARKER}"

# Check for duplicate.
if crontab -l 2>/dev/null | grep -qF "# ${CRON_MARKER}"; then
  echo "[setup-backup-cron] Cron job already installed:"
  crontab -l 2>/dev/null | grep "# ${CRON_MARKER}"
  echo ""
  echo "To update, remove the existing entry first:"
  echo "  (crontab -l | grep -vF '# ${CRON_MARKER}') | crontab -"
  exit 0
fi

# Install.
(crontab -l 2>/dev/null; echo "${CRON_CMD}") | crontab -

echo "[setup-backup-cron] Installed successfully."
echo "  Schedule : ${BACKUP_SCHEDULE}"
echo "  Retention: ${BACKUP_RETENTION_DAYS} days"
echo "  Log      : /tmp/${CRON_MARKER}.log"
echo ""
echo "Verify with: crontab -l"
