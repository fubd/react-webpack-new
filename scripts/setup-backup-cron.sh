#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 3 * * *}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
EXTRA_ENV_FILE="${EXTRA_ENV_FILE:-}"
MYSQL_SERVICE="${MYSQL_SERVICE:-mysql}"
BACKUP_DIR="${PROJECT_DIR}/backups/mysql"
LOG_FILE="${BACKUP_DIR}/backup-cron.log"
CRON_MARKER="parrot-db-backup"

quote_for_shell() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

build_assignment() {
  printf "%s=%s " "$1" "$(quote_for_shell "$2")"
}

if [[ -f "${PROJECT_DIR}/${ENV_FILE}" ]]; then
  DATABASE_NAME="$(grep -E '^MYSQL_DATABASE=' "${PROJECT_DIR}/${ENV_FILE}" | cut -d= -f2- | tr -d '[:space:]')"
fi
DATABASE_NAME="${DATABASE_NAME:-parrot}"

mkdir -p "${BACKUP_DIR}"

if [[ "${1:-}" == "--remove" ]]; then
  if ! crontab -l 2>/dev/null | grep -qF "# ${CRON_MARKER}"; then
    echo "[setup-backup-cron] No installed cron job matched ${CRON_MARKER}."
    exit 0
  fi

  filtered_crontab="$(crontab -l 2>/dev/null | grep -vF "# ${CRON_MARKER}" || true)"
  printf '%s\n' "${filtered_crontab}" | crontab -
  echo "[setup-backup-cron] Removed cron job ${CRON_MARKER}."
  exit 0
fi

extra_env_part=""
if [[ -n "${EXTRA_ENV_FILE}" ]]; then
  extra_env_part="$(build_assignment EXTRA_ENV_FILE "${EXTRA_ENV_FILE}")"
fi

CRON_CMD="${BACKUP_SCHEDULE} cd $(quote_for_shell "${PROJECT_DIR}") && PATH=/usr/local/bin:/usr/bin:/bin $(build_assignment BACKUP_DIR "${BACKUP_DIR}")$(build_assignment DATABASE_NAME "${DATABASE_NAME}")$(build_assignment BACKUP_RETENTION_DAYS "${BACKUP_RETENTION_DAYS}")$(build_assignment COMPOSE_FILE "${COMPOSE_FILE}")$(build_assignment ENV_FILE "${ENV_FILE}")$(build_assignment MYSQL_SERVICE "${MYSQL_SERVICE}")${extra_env_part}bash scripts/mysql-backup.sh >> $(quote_for_shell "${LOG_FILE}") 2>&1 # ${CRON_MARKER}"

if crontab -l 2>/dev/null | grep -qF "# ${CRON_MARKER}"; then
  echo "[setup-backup-cron] Cron job already installed:"
  crontab -l 2>/dev/null | grep "# ${CRON_MARKER}"
  echo ""
  echo "To update, remove the existing entry first:"
  echo "  bash scripts/setup-backup-cron.sh --remove"
  exit 0
fi

(crontab -l 2>/dev/null; echo "${CRON_CMD}") | crontab -

echo "[setup-backup-cron] Installed successfully."
echo "  Schedule : ${BACKUP_SCHEDULE}"
echo "  Log      : ${LOG_FILE}"
echo "  Compose  : ${COMPOSE_FILE}"
if [[ -n "${EXTRA_ENV_FILE}" ]]; then
  echo "  Extra env: ${EXTRA_ENV_FILE}"
fi
echo ""
echo "Verify with: crontab -l"
