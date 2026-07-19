#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-start}"
DISPLAY_ID="${XYQ_DISPLAY:-:98}"
SCREEN="${XYQ_SCREEN:-1920x1080x24}"
VNC_PORT="${XYQ_VNC_PORT:-5908}"
NOVNC_PORT="${XYQ_NOVNC_PORT:-6099}"
CDP_PORT="${XYQ_CDP_PORT:-9344}"
PROFILE_DIR="${XYQ_PROFILE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/xyq-chrome}"
STATE_DIR="${XYQ_NOVNC_STATE:-${XDG_STATE_HOME:-$HOME/.local/state}/lala-studio-xyq-novnc}"
URL="${XYQ_URL:-https://xyq.jianying.com/home?tab_name=integrated-agent}"
NOVNC_WEB="${NOVNC_WEB_ROOT:-/usr/share/novnc}"
CDP_URL="http://127.0.0.1:$CDP_PORT"
NOVNC_URL="http://127.0.0.1:$NOVNC_PORT/vnc.html?host=127.0.0.1&port=$NOVNC_PORT&autoconnect=1&resize=scale"

mkdir -p "$STATE_DIR" "$STATE_DIR/logs" "$PROFILE_DIR"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 3; }
}

port_ready() {
  ss -ltn | awk '{print $4}' | grep -Eq "(^|:)${1}$"
}

pid_alive() {
  [[ -f "$1" ]] || return 1
  local pid
  pid="$(cat "$1" 2>/dev/null || true)"
  [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

stop_pid() {
  if pid_alive "$1"; then
    local pid
    pid="$(cat "$1")"
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  fi
  rm -f "$1"
}

browser_pid() {
  local pid command
  while read -r pid; do
    [[ -r "/proc/$pid/cmdline" ]] || continue
    command="$(tr '\0' ' ' < "/proc/$pid/cmdline")"
    [[ "$command" == *"--remote-debugging-port=${CDP_PORT}"* ]] || continue
    [[ "$command" == *"--type="* ]] && continue
    printf '%s\n' "$pid"
    return 0
  done < <(pgrep -f -- "--remote-debugging-port=${CDP_PORT}( |$)" || true)
}

discover_browser_display() {
  local pid="$1" socket number candidate
  [[ -n "$pid" ]] || return 1
  for candidate in "$DISPLAY_ID"; do
    if DISPLAY="$candidate" xdotool search --pid "$pid" >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  for socket in /tmp/.X11-unix/X*; do
    [[ -S "$socket" ]] || continue
    number="${socket##*X}"
    candidate=":$number"
    [[ "$candidate" == "$DISPLAY_ID" ]] && continue
    if DISPLAY="$candidate" xdotool search --pid "$pid" >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

fit_browser_window() {
  local display="$1" pid="$2" window="" width="" height=""
  [[ -n "$pid" ]] || return 0
  window="$(DISPLAY="$display" xdotool search --onlyvisible --pid "$pid" 2>/dev/null | tail -n 1 || true)"
  [[ -n "$window" ]] || window="$(DISPLAY="$display" xdotool search --pid "$pid" 2>/dev/null | tail -n 1 || true)"
  [[ -n "$window" ]] || return 0
  read -r width height < <(DISPLAY="$display" xdotool getdisplaygeometry)
  DISPLAY="$display" xdotool windowmap "$window" windowmove --sync "$window" 0 0 windowsize --sync "$window" "$width" "$height" windowraise "$window" >/dev/null 2>&1 || true
}

show_status() {
  local attached="${DISPLAY_ID}"
  [[ -f "$STATE_DIR/display" ]] && attached="$(cat "$STATE_DIR/display")"
  printf 'Xiaoyunque visible desktop\n'
  printf '  display: %s (%s)\n' "$attached" "$(DISPLAY="$attached" xdpyinfo >/dev/null 2>&1 && echo ready || echo down)"
  printf '  VNC:     127.0.0.1:%s (%s)\n' "$VNC_PORT" "$(port_ready "$VNC_PORT" && echo ready || echo down)"
  printf '  noVNC:   %s (%s)\n' "$NOVNC_URL" "$(curl -fsS "$NOVNC_URL" >/dev/null 2>&1 && echo ready || echo down)"
  printf '  CDP:     %s (%s)\n' "$CDP_URL" "$(curl -fsS "$CDP_URL/json/version" >/dev/null 2>&1 && echo ready || echo down)"
  printf '  profile: %s\n' "$PROFILE_DIR"
}

if [[ "$ACTION" == "status" ]]; then
  show_status
  exit 0
fi
if [[ "$ACTION" == "stop" ]]; then
  stop_pid "$STATE_DIR/chrome.pid"
  stop_pid "$STATE_DIR/novnc.pid"
  stop_pid "$STATE_DIR/x11vnc.pid"
  stop_pid "$STATE_DIR/xvfb.pid"
  rm -f "$STATE_DIR/display"
  show_status
  exit 0
fi
[[ "$ACTION" == "start" ]] || { echo "Usage: $0 [start|status|stop]" >&2; exit 2; }

need curl
need ss
need Xvfb
need xdpyinfo
need xdotool
need x11vnc
need websockify
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[[ -n "$CHROME" ]] || { echo "Chrome/Chromium is required" >&2; exit 3; }

ATTACHED_DISPLAY="$DISPLAY_ID"
PID="$(browser_pid)"
if curl -fsS "$CDP_URL/json/version" >/dev/null 2>&1; then
  ATTACHED_DISPLAY="$(discover_browser_display "$PID")" || {
    echo "CDP $CDP_URL is active, but its browser window is not visible on an accessible X display" >&2
    exit 4
  }
else
  if ! DISPLAY="$DISPLAY_ID" xdpyinfo >/dev/null 2>&1; then
    setsid Xvfb "$DISPLAY_ID" -screen 0 "$SCREEN" -ac -nolisten tcp >"$STATE_DIR/logs/xvfb.log" 2>&1 < /dev/null &
    echo "$!" >"$STATE_DIR/xvfb.pid"
    for _ in {1..60}; do DISPLAY="$DISPLAY_ID" xdpyinfo >/dev/null 2>&1 && break; sleep .25; done
  fi
  DISPLAY="$DISPLAY_ID" xdpyinfo >/dev/null 2>&1 || { tail -n 80 "$STATE_DIR/logs/xvfb.log" >&2; exit 4; }
fi
PREVIOUS_DISPLAY="$(cat "$STATE_DIR/display" 2>/dev/null || true)"
if [[ -n "$PREVIOUS_DISPLAY" && "$PREVIOUS_DISPLAY" != "$ATTACHED_DISPLAY" ]]; then
  stop_pid "$STATE_DIR/novnc.pid"
  stop_pid "$STATE_DIR/x11vnc.pid"
fi
printf '%s\n' "$ATTACHED_DISPLAY" >"$STATE_DIR/display"

if ! port_ready "$VNC_PORT"; then
  env DISPLAY="$ATTACHED_DISPLAY" setsid x11vnc -display "$ATTACHED_DISPLAY" -localhost -nopw -forever -shared -noxdamage \
    -rfbport "$VNC_PORT" -o "$STATE_DIR/logs/x11vnc.log" >"$STATE_DIR/logs/x11vnc.stdout.log" 2>&1 < /dev/null &
  echo "$!" >"$STATE_DIR/x11vnc.pid"
  for _ in {1..60}; do port_ready "$VNC_PORT" && break; sleep .25; done
fi
port_ready "$VNC_PORT" || { tail -n 80 "$STATE_DIR/logs/x11vnc.log" >&2; exit 5; }

if ! port_ready "$NOVNC_PORT"; then
  setsid websockify --web="$NOVNC_WEB" "127.0.0.1:$NOVNC_PORT" "127.0.0.1:$VNC_PORT" >"$STATE_DIR/logs/novnc.log" 2>&1 < /dev/null &
  echo "$!" >"$STATE_DIR/novnc.pid"
  for _ in {1..60}; do curl -fsS "$NOVNC_URL" >/dev/null 2>&1 && break; sleep .25; done
fi
curl -fsS "$NOVNC_URL" >/dev/null || { tail -n 80 "$STATE_DIR/logs/novnc.log" >&2; exit 5; }

if ! curl -fsS "$CDP_URL/json/version" >/dev/null 2>&1; then
  env DISPLAY="$ATTACHED_DISPLAY" setsid "$CHROME" \
    --remote-debugging-address=127.0.0.1 \
    --remote-debugging-port="$CDP_PORT" \
    --remote-allow-origins="http://127.0.0.1:$CDP_PORT" \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run --no-default-browser-check --hide-crash-restore-bubble --ozone-platform=x11 \
    --window-position=0,0 --window-size=1920,1080 \
    "$URL" >"$STATE_DIR/logs/chrome.log" 2>&1 < /dev/null &
  echo "$!" >"$STATE_DIR/chrome.pid"
  for _ in {1..180}; do curl -fsS "$CDP_URL/json/version" >/dev/null 2>&1 && break; sleep .25; done
fi
curl -fsS "$CDP_URL/json/version" >/dev/null || { tail -n 80 "$STATE_DIR/logs/chrome.log" >&2; exit 6; }

PID="$(browser_pid)"
fit_browser_window "$ATTACHED_DISPLAY" "$PID"

show_status
