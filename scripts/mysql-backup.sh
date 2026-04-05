#!/usr/bin/env bash

set -euo pipefail

MYSQL_SERVICE="${MYSQL_SERVICE:-mysql}"
COMPOSE_FILE="${COMPOSE_FILE:-}"
ENV_FILE="${ENV_FILE:-}"
EXTRA_ENV_FILE="${EXTRA_ENV_FILE:-}"
BACKUP_DIR="${BACKUP_DIR:-backups/mysql}"
DATABASE_NAME="${DATABASE_NAME:-mysql}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-0}"

compose_cmd=(docker compose)

if [[ -n "${COMPOSE_FILE}" ]]; then
  compose_cmd+=(-f "${COMPOSE_FILE}")
fi

if [[ -n "${ENV_FILE}" ]]; then
  compose_cmd+=(--env-file "${ENV_FILE}")
fi

if [[ -n "${EXTRA_ENV_FILE}" ]]; then
  compose_cmd+=(--env-file "${EXTRA_ENV_FILE}")
fi

if ! "${compose_cmd[@]}" ps --status running "${MYSQL_SERVICE}" >/dev/null 2>&1; then
  echo "MySQL service '${MYSQL_SERVICE}' is not running." >&2
  exit 1
fi

timestamp="$(date '+%Y%m%d_%H%M%S')"
output_file="${1:-${BACKUP_DIR}/${DATABASE_NAME}_${timestamp}.sql.gz}"
output_dir="$(dirname "${output_file}")"
tmp_file="${output_file}.tmp"

mkdir -p "${output_dir}"

cleanup() {
  rm -f "${tmp_file}"
}

trap cleanup EXIT

"${compose_cmd[@]}" exec -T "${MYSQL_SERVICE}" sh -lc '
  export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
  exec mysqldump \
    --single-transaction \
    --skip-lock-tables \
    --quick \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    -uroot \
    --databases "$MYSQL_DATABASE"
' | gzip -c > "${tmp_file}"

mv "${tmp_file}" "${output_file}"
trap - EXIT

echo "Created MySQL backup: ${output_file}"

# Retention cleanup: remove backups older than BACKUP_RETENTION_DAYS days.
if [[ "${BACKUP_RETENTION_DAYS}" -gt 0 ]]; then
  find "${output_dir}" -maxdepth 1 -name "*.sql.gz" -mtime +"${BACKUP_RETENTION_DAYS}" -delete
  echo "Cleaned up backups older than ${BACKUP_RETENTION_DAYS} days in ${output_dir}"
fi
