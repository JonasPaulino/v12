#!/bin/sh
set -eu

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_DATABASE:-}" ]; then
  echo "Variaveis de banco nao definidas, migrations ignoradas."
  exit 0
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

export PGPASSWORD="${DB_PASSWORD:-}"

for file in "$MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$file" ]; then
    continue
  fi

  echo "Aplicando migration: $file"
  psql \
    --host="$DB_HOST" \
    --port="${DB_PORT:-5432}" \
    --username="$DB_USER" \
    --dbname="$DB_DATABASE" \
    --file="$file"
done
