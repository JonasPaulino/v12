#!/bin/sh
set -eu

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_DATABASE:-}" ]; then
  echo "Variaveis de banco nao definidas, migrations ignoradas."
  exit 0
fi

SERVICE_NAME="backend"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

export PGPASSWORD="${DB_PASSWORD:-}"

psql \
  --host="$DB_HOST" \
  --port="${DB_PORT:-5432}" \
  --username="$DB_USER" \
  --dbname="$DB_DATABASE" \
  -v ON_ERROR_STOP=1 \
  <<'SQL'
CREATE TABLE IF NOT EXISTS public.app_migration (
  app_migration_id BIGSERIAL PRIMARY KEY,
  service_name VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  aplicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_name, file_name)
);
SQL

for file in "$MIGRATIONS_DIR"/*.sql; do
  if [ ! -f "$file" ]; then
    continue
  fi

  base_name="$(basename "$file")"
  case "$base_name" in
    998_*|999_*)
      echo "Ignorando script auxiliar: $file"
      continue
      ;;
  esac

  already_applied="$(
    psql \
      --host="$DB_HOST" \
      --port="${DB_PORT:-5432}" \
      --username="$DB_USER" \
      --dbname="$DB_DATABASE" \
      --tuples-only \
      --no-align \
      -c "SELECT 1 FROM public.app_migration WHERE service_name = '$SERVICE_NAME' AND file_name = '$base_name' LIMIT 1;"
  )"

  if [ "$already_applied" = "1" ]; then
    echo "Migration ja aplicada: $file"
    continue
  fi

  echo "Aplicando migration: $file"
  psql \
    --host="$DB_HOST" \
    --port="${DB_PORT:-5432}" \
    --username="$DB_USER" \
    --dbname="$DB_DATABASE" \
    -v ON_ERROR_STOP=1 \
    --file="$file"

  psql \
    --host="$DB_HOST" \
    --port="${DB_PORT:-5432}" \
    --username="$DB_USER" \
    --dbname="$DB_DATABASE" \
    -v ON_ERROR_STOP=1 \
    -c "INSERT INTO public.app_migration (service_name, file_name) VALUES ('$SERVICE_NAME', '$base_name') ON CONFLICT (service_name, file_name) DO NOTHING;"
done
