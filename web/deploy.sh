#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$ROOT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f "$PROJECT_ROOT/.env" ]; then
  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
  echo "Arquivo .env nao encontrado na raiz do v12."
  echo "Foi criada uma copia inicial a partir de .env.example."
  echo "Revise as variaveis antes de seguir em producao."
fi

compose() {
  docker compose -p v12 --env-file "$PROJECT_ROOT/.env" -f "$ROOT_DIR/docker-compose.yml" "$@"
}

ACTION="${1:-up}"
TARGET_SERVICE="${2:-}"

case "$ACTION" in
  up|all|deploy)
    compose up -d --build --remove-orphans ${TARGET_SERVICE:+$TARGET_SERVICE}
    ;;
  down)
    compose down --remove-orphans
    ;;
  restart)
    compose down --remove-orphans
    compose up -d --build --remove-orphans ${TARGET_SERVICE:+$TARGET_SERVICE}
    ;;
  rebuild)
    if [ -n "$TARGET_SERVICE" ]; then
      compose build "$TARGET_SERVICE"
      compose up -d --remove-orphans "$TARGET_SERVICE"
    else
      compose build
      compose up -d --remove-orphans
    fi
    ;;
  rebuild-clean)
    if [ -n "$TARGET_SERVICE" ]; then
      compose build --no-cache "$TARGET_SERVICE"
      compose up -d --remove-orphans "$TARGET_SERVICE"
    else
      compose build --no-cache
      compose up -d --remove-orphans
    fi
    ;;
  logs)
    compose logs -f ${TARGET_SERVICE:+$TARGET_SERVICE}
    ;;
  *)
    echo "Uso: ./deploy.sh [up|down|restart|rebuild|rebuild-clean|logs] [servico]"
    exit 1
    ;;
esac
