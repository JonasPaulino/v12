#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
SERVER_LOG="$RUNTIME_DIR/pdv-server.log"
STATION_LOG="$RUNTIME_DIR/pdv-station.log"

mkdir -p "$RUNTIME_DIR"

SERVER_PID=""
STATION_PID=""

cleanup() {
  if [[ -n "${STATION_PID}" ]] && kill -0 "${STATION_PID}" 2>/dev/null; then
    kill "${STATION_PID}" 2>/dev/null || true
  fi

  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local max_attempts="${3:-40}"
  local attempt=1

  until curl -fsS "$url" >/dev/null 2>&1; do
    if (( attempt >= max_attempts )); then
      echo "Falha ao iniciar ${label}."
      echo "Veja o log em: ./.runtime/pdv-server.log"
      echo "Veja o log em: ./.runtime/pdv-station.log"
      return 1
    fi

    sleep 1
    ((attempt++))
  done

  return 0
}

trap cleanup EXIT INT TERM

echo "Subindo servidor local do PDV..."
(
  cd "$ROOT_DIR"
  npm run dev:server
) >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

wait_for_url "http://127.0.0.1:5100/api/local/healthz" "servidor local do PDV" 30
echo "Subindo front da estação..."
(
  cd "$ROOT_DIR"
  npm run dev:station
) >"$STATION_LOG" 2>&1 &
STATION_PID=$!

wait_for_url "http://127.0.0.1:5174" "front da estação" 45

echo "Abrindo Electron..."
cd "$ROOT_DIR/apps/station"
npm run dev:electron
