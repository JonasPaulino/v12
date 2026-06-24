#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT_DIR"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Arquivo .env nao encontrado na raiz do v12."
  echo "Foi criada uma copia inicial a partir de .env.example."
  echo "Revise as variaveis antes de seguir em producao."
fi

ACTION="${1:-up}"
TARGET_SERVICE="${2:-}"

case "$ACTION" in
  up|all|deploy)
    docker compose up -d --build --remove-orphans ${TARGET_SERVICE:+$TARGET_SERVICE}
    ;;
  down)
    docker compose down --remove-orphans
    ;;
  restart)
    docker compose down --remove-orphans
    docker compose up -d --build --remove-orphans ${TARGET_SERVICE:+$TARGET_SERVICE}
    ;;
  rebuild)
    if [ -n "$TARGET_SERVICE" ]; then
      docker compose build "$TARGET_SERVICE"
      docker compose up -d --remove-orphans "$TARGET_SERVICE"
    else
      docker compose build
      docker compose up -d --remove-orphans
    fi
    ;;
  rebuild-clean)
    if [ -n "$TARGET_SERVICE" ]; then
      docker compose build --no-cache "$TARGET_SERVICE"
      docker compose up -d --remove-orphans "$TARGET_SERVICE"
    else
      docker compose build --no-cache
      docker compose up -d --remove-orphans
    fi
    ;;
  logs)
    docker compose logs -f ${TARGET_SERVICE:+$TARGET_SERVICE}
    ;;
  *)
    echo "Uso: ./deploy.sh [up|down|restart|rebuild|rebuild-clean|logs] [servico]"
    exit 1
    ;;
esac
