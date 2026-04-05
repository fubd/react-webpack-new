#!/usr/bin/env bash

set -euo pipefail

MYSQL_SERVICE="${MYSQL_SERVICE:-mysql}"
COMPOSE_FILE="${COMPOSE_FILE:-}"
ENV_FILE="${ENV_FILE:-}"
EXTRA_ENV_FILE="${EXTRA_ENV_FILE:-}"

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/mysql-restore.sh /path/to/backup.sql[.gz]" >&2
  exit 1
fi

backup_file="$1"

if [[ ! -f "${backup_file}" ]]; then
  echo "Backup file not found: ${backup_file}" >&2
  exit 1
fi

if [[ -t 0 ]]; then
  echo ""
  echo "⚠  This will OVERWRITE the current database with: ${backup_file}"
  echo -n "  Type 'yes' to continue: "
  read -r confirm
  if [[ "${confirm}" != "yes" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

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

if [[ "${backup_file}" == *.gz ]]; then
  gzip -dc -- "${backup_file}" | "${compose_cmd[@]}" exec -T "${MYSQL_SERVICE}" sh -lc '
    export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
    exec mysql --default-character-set=utf8mb4 -uroot
  '
else
  cat -- "${backup_file}" | "${compose_cmd[@]}" exec -T "${MYSQL_SERVICE}" sh -lc '
    export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
    exec mysql --default-character-set=utf8mb4 -uroot
  '
fi

echo "Restored MySQL from: ${backup_file}"
