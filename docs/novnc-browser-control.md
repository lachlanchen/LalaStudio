# Isolated noVNC Browser Control

Lala Studio includes a dedicated virtual desktop and a Playwright controller for visible, repeatable operation of the webapp. This browser is separate from Xiaoyunque, JLCEDA, and AgenticApp profiles.

## Default Stack

| Service | Default |
| --- | --- |
| Lala Studio | `http://127.0.0.1:4412` |
| X display | `:96` |
| x11vnc | `127.0.0.1:5916` |
| noVNC | `http://127.0.0.1:6116/vnc_lite.html?host=127.0.0.1&port=6116&autoconnect=1&resize=remote` |
| Chrome CDP | `http://127.0.0.1:9466` |
| Chrome profile | `${XDG_CACHE_HOME:-$HOME/.cache}/lala-studio-browser` |

Override any value with the `LALA_STUDIO_*` environment variables or launcher flags.

## Launch

```bash
scripts/launch_studio_novnc.sh start --project-root "$LALA_STUDIO_PROJECT_ROOT"
scripts/launch_studio_novnc.sh status --project-root "$LALA_STUDIO_PROJECT_ROOT"
```

The launcher builds stale frontend assets, starts the app, creates the isolated display, starts noVNC, launches Chrome, and reuses one Lala Studio tab.

## Direct UI Commands

```bash
node tools/lala-studio-browser.mjs status
node tools/lala-studio-browser.mjs select-story --match "千岛湖"
node tools/lala-studio-browser.mjs chat \
  --action final \
  --message "Polish the current story and return a complete final version"
node tools/lala-studio-browser.mjs apply-last
node tools/lala-studio-browser.mjs save
node tools/lala-studio-browser.mjs production \
  --message "Generate this 15 second 4:3 video with the lowest-credit model" \
  --operation inspect
```

For an explicitly requested paid run:

```bash
node tools/lala-studio-browser.mjs production \
  --operation generate \
  --confirm-paid \
  --wait-seconds 7200
```

The controller does not mutate Studio APIs directly. It types, clicks, and waits on visible DOM state through the dedicated Chrome CDP session. Evidence is stored under `.runtime/browser-evidence/`.

## Recovery

Do not create a new tab when a job appears slow. Inspect `status`, keep the existing tab in front, and wait for the visible terminal state. If the app cannot expose reliable progress, add a general state marker to the app and retry from the last proven step. Never repeat a paid click when the previous result is unknown.

Generated media must be resolved from the current result card, not from every `video` element on the page. Validate duration and dimensions with `ffprobe` before accepting or copying a download; unrelated promotional and stale-result media must fail closed.
