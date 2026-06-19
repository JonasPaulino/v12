#!/bin/sh
set -eu

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_DATABASE:-}" ]; then
  echo "Variaveis de banco nao definidas, migrations ignoradas."
  exit 0
fi

export PGPASSWORD="${DB_PASSWORD:-}"

for file in /app/migrations/*.sql; do
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

  echo "Aplicando migration: $file"
  psql \
    --host="$DB_HOST" \
    --port="${DB_PORT:-5432}" \
    --username="$DB_USER" \
    --dbname="$DB_DATABASE" \
    --file="$file"
done
