#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
STUDIO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
DISPLAY_ID="${LALA_STUDIO_DISPLAY:-:96}"
SCREEN="${LALA_STUDIO_SCREEN:-1920x1080x24}"
VNC_PORT="${LALA_STUDIO_VNC_PORT:-5916}"
NOVNC_PORT="${LALA_STUDIO_NOVNC_PORT:-6116}"
CDP_PORT="${LALA_STUDIO_BROWSER_CDP_PORT:-9466}"
APP_PORT="${LALA_STUDIO_APP_PORT:-4412}"
PROFILE_DIR="${LALA_STUDIO_BROWSER_PROFILE:-${XDG_CACHE_HOME:-$HOME/.cache}/lala-studio-browser}"
STATE_DIR="${LALA_STUDIO_DESKTOP_STATE:-${XDG_STATE_HOME:-$HOME/.local/state}/lala-studio-novnc}"
XYQ_CDP_PORT="${XYQ_CDP_PORT:-9344}"
XYQ_NOVNC_PORT="${XYQ_NOVNC_PORT:-6099}"
PROJECT_ROOT="${LALA_STUDIO_PROJECT_ROOT:-}"
ACTION="start"
BUILD="auto"

usage() {
  cat <<'EOF'
Usage: scripts/launch_studio_novnc.sh [start|status|stop|restart] [options]

Options:
  --project-root DIR   LALACHAN project root served by Lala Studio.
  --display :N        Dedicated X display. Default: :96
  --screen WxHxD      Virtual screen. Default: 1920x1080x24
  --vnc-port PORT     Local x11vnc port. Default: 5916
  --novnc-port PORT   Local noVNC port. Default: 6116
  --cdp-port PORT     Dedicated Chrome CDP port. Default: 9466
  --app-port PORT     Lala Studio HTTP port. Default: 4412
  --profile DIR       Dedicated Chrome profile directory.
  --build             Rebuild before launch.
  --no-build          Do not rebuild unless dist/ is missing.

This stack is intentionally separate from Xiaoyunque, JLCEDA, and AgenticApp browsers.
EOF
}

if [[ $# -gt 0 && "$1" =~ ^(start|status|stop|restart)$ ]]; then
  ACTION="$1"
  shift
fi
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-root) PROJECT_ROOT="$2"; shift 2 ;;
    --display) DISPLAY_ID="$2"; shift 2 ;;
    --screen) SCREEN="$2"; shift 2 ;;
    --vnc-port) VNC_PORT="$2"; shift 2 ;;
    --novnc-port) NOVNC_PORT="$2"; shift 2 ;;
    --cdp-port) CDP_PORT="$2"; shift 2 ;;
    --app-port) APP_PORT="$2"; shift 2 ;;
    --profile) PROFILE_DIR="$2"; shift 2 ;;
    --build) BUILD="yes"; shift ;;
    --no-build) BUILD="no"; shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$PROJECT_ROOT" ]]; then
  if [[ -d "$STUDIO_ROOT/../references" && -d "$STUDIO_ROOT/../scripts" ]]; then
    PROJECT_ROOT="$(cd "$STUDIO_ROOT/.." && pwd -P)"
  elif [[ -d "$PWD/references" && -d "$PWD/scripts" ]]; then
    PROJECT_ROOT="$(pwd -P)"
  else
    echo "Cannot discover the LALACHAN project root. Pass --project-root or LALA_STUDIO_PROJECT_ROOT." >&2
    exit 2
  fi
fi
PROJECT_ROOT="$(cd "$PROJECT_ROOT" && pwd -P)"

mkdir -p "$STATE_DIR" "$PROFILE_DIR"
LOG_DIR="$STATE_DIR/logs"
mkdir -p "$LOG_DIR"
APP_URL="http://127.0.0.1:$APP_PORT"
CDP_URL="http://127.0.0.1:$CDP_PORT"
NOVNC_URL="http://127.0.0.1:$NOVNC_PORT/vnc_lite.html?host=127.0.0.1&port=$NOVNC_PORT&autoconnect=1&scale=1"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 3; }
}

pid_alive() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  local pid
  pid="$(cat "$file" 2>/dev/null || true)"
  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

stop_pid() {
  local file="$1"
  if pid_alive "$file"; then
    local pid
    pid="$(cat "$file")"
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    for _ in {1..30}; do kill -0 "$pid" 2>/dev/null || break; sleep .1; done
  fi
  rm -f "$file"
}

show_status() {
  printf 'Lala Studio isolated desktop\n'
  printf '  app:      %s (%s)\n' "$APP_URL" "$(curl -fsS "$APP_URL/api/health" >/dev/null 2>&1 && echo ready || echo down)"
  printf '  display:  %s (%s)\n' "$DISPLAY_ID" "$(DISPLAY="$DISPLAY_ID" xdpyinfo >/dev/null 2>&1 && echo ready || echo down)"
  printf '  vnc:      127.0.0.1:%s\n' "$VNC_PORT"
  printf '  noVNC:    %s\n' "$NOVNC_URL"
  printf '  CDP:      %s (%s)\n' "$CDP_URL" "$(curl -fsS "$CDP_URL/json/version" >/dev/null 2>&1 && echo ready || echo down)"
  printf '  profile:  %s\n' "$PROFILE_DIR"
  printf '  project:  %s\n' "$PROJECT_ROOT"
  printf '  state:    %s\n' "$STATE_DIR"
}

if [[ "$ACTION" == "stop" || "$ACTION" == "restart" ]]; then
  stop_pid "$STATE_DIR/chrome.pid"
  stop_pid "$STATE_DIR/novnc.pid"
  stop_pid "$STATE_DIR/x11vnc.pid"
  stop_pid "$STATE_DIR/xvfb.pid"
  stop_pid "$STATE_DIR/studio.pid"
  [[ "$ACTION" == "stop" ]] && { show_status; exit 0; }
fi
if [[ "$ACTION" == "status" ]]; then
  show_status
  exit 0
fi

need Xvfb
need x11vnc
need websockify
need xdpyinfo
need curl
need node
need npm
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[[ -n "$CHROME" ]] || { echo "Chrome/Chromium is required" >&2; exit 3; }

if [[ "$BUILD" == "yes" || ! -f "$STUDIO_ROOT/dist/index.html" ]]; then
  (cd "$STUDIO_ROOT" && npm run build)
elif [[ "$BUILD" == "auto" ]]; then
  newest_source="$(find "$STUDIO_ROOT/src" "$STUDIO_ROOT/server" -type f -newer "$STUDIO_ROOT/dist/index.html" -print -quit)"
  [[ -z "$newest_source" ]] || (cd "$STUDIO_ROOT" && npm run build)
fi

if ! curl -fsS "$APP_URL/api/health" >/dev/null 2>&1; then
  env LALA_STUDIO_PROJECT_ROOT="$PROJECT_ROOT" LALA_STUDIO_PORT="$APP_PORT" \
    LALA_STUDIO_XYQ_CDP_URL="http://127.0.0.1:$XYQ_CDP_PORT" \
    LALA_STUDIO_XYQ_NOVNC_URL="http://127.0.0.1:$XYQ_NOVNC_PORT/vnc_lite.html?host=127.0.0.1&port=$XYQ_NOVNC_PORT&autoconnect=1&scale=1" \
    setsid npm --prefix "$STUDIO_ROOT" run start >"$LOG_DIR/studio.log" 2>&1 < /dev/null &
  echo "$!" >"$STATE_DIR/studio.pid"
  for _ in {1..120}; do curl -fsS "$APP_URL/api/health" >/dev/null 2>&1 && break; sleep .25; done
fi
curl -fsS "$APP_URL/api/health" >/dev/null || { tail -n 100 "$LOG_DIR/studio.log" >&2; exit 4; }

if ! DISPLAY="$DISPLAY_ID" xdpyinfo >/dev/null 2>&1; then
  setsid Xvfb "$DISPLAY_ID" -screen 0 "$SCREEN" -ac -nolisten tcp >"$LOG_DIR/xvfb.log" 2>&1 < /dev/null &
  echo "$!" >"$STATE_DIR/xvfb.pid"
  for _ in {1..40}; do DISPLAY="$DISPLAY_ID" xdpyinfo >/dev/null 2>&1 && break; sleep .25; done
fi
DISPLAY="$DISPLAY_ID" xdpyinfo >/dev/null 2>&1 || { tail -n 100 "$LOG_DIR/xvfb.log" >&2; exit 4; }

if ! ss -ltn | awk '{print $4}' | grep -Eq "(^|:)${VNC_PORT}$"; then
  env DISPLAY="$DISPLAY_ID" setsid x11vnc -display "$DISPLAY_ID" -localhost -nopw -forever -shared -rfbport "$VNC_PORT" \
    -o "$LOG_DIR/x11vnc.log" >"$LOG_DIR/x11vnc.stdout.log" 2>&1 < /dev/null &
  echo "$!" >"$STATE_DIR/x11vnc.pid"
  for _ in {1..40}; do ss -ltn | awk '{print $4}' | grep -Eq "(^|:)${VNC_PORT}$" && break; sleep .25; done
fi
if ! ss -ltn | awk '{print $4}' | grep -Eq "(^|:)${NOVNC_PORT}$"; then
  setsid websockify --web=/usr/share/novnc "127.0.0.1:$NOVNC_PORT" "127.0.0.1:$VNC_PORT" >"$LOG_DIR/novnc.log" 2>&1 < /dev/null &
  echo "$!" >"$STATE_DIR/novnc.pid"
fi

if ! curl -fsS "$CDP_URL/json/version" >/dev/null 2>&1; then
  env DISPLAY="$DISPLAY_ID" setsid "$CHROME" \
    --remote-debugging-address=127.0.0.1 \
    --remote-debugging-port="$CDP_PORT" \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run --no-default-browser-check --disable-default-apps --disable-sync \
    --disable-background-networking --disable-dev-shm-usage --disable-gpu \
    --ozone-platform=x11 --window-position=0,0 --window-size=1920,1080 \
    about:blank >"$LOG_DIR/chrome.log" 2>&1 < /dev/null &
  echo "$!" >"$STATE_DIR/chrome.pid"
  for _ in {1..160}; do curl -fsS "$CDP_URL/json/version" >/dev/null 2>&1 && break; sleep .25; done
fi
curl -fsS "$CDP_URL/json/version" >/dev/null || { tail -n 100 "$LOG_DIR/chrome.log" >&2; exit 5; }

(cd "$STUDIO_ROOT" && node tools/lala-studio-browser.mjs open --cdp-url "$CDP_URL" --app-url "$APP_URL" >/dev/null)
show_status
