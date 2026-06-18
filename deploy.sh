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

case "$ACTION" in
  up|all|deploy)
    docker compose up -d --build --remove-orphans
    ;;
  down)
    docker compose down --remove-orphans
    ;;
  restart)
    docker compose down --remove-orphans
    docker compose up -d --build --remove-orphans
    ;;
  logs)
    docker compose logs -f
    ;;
  *)
    echo "Uso: ./deploy.sh [up|down|restart|logs]"
    exit 1
    ;;
esac
