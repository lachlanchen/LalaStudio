# World Bible and Media Versioning

Lala Studio treats continuity as structured project data rather than a growing prompt. The canonical file is:

```text
references/world/lalachan-world.json
```

The repository can provide this file directly. For a new compatible project, Studio creates a small starter world so the application remains portable.

## Canon Model

The database stores:

- characters, voices, visual rules, and relationships;
- recurring places and their connections;
- tools with stable uses and limits;
- versioned outfits;
- open or resolved story arcs;
- recurring themes/topics;
- connected episode records;
- reference-image, generated-image, and video lineage.

The **World** workspace is the normal editing surface. A planned episode selects only the relevant canon records. Writers receive this focused context, while the Xiaoyunque prompt receives an even smaller continuity block. The full database is never dumped into a short-video prompt.

## Episode Contract

A connected episode should:

1. Reuse at least one familiar place, object, outfit, or relationship.
2. Present one concrete problem with a visible cause-and-effect chain.
3. Give each selected character a purposeful action.
4. Resolve the episode's immediate problem.
5. Leave at most one small visual or spoken clue for an open arc.

This keeps each short understandable while allowing a larger mystery to grow gradually.

## Media Lineage

Generated word cards and scene keyframes are copied to:

```text
references/world/media/<story-id>/<role>-vNNN.png
```

Each media record contains its SHA-256, version, source episode, replacement link, and Git tracking policy. New versions are appended; an existing canonical image is not silently overwritten.

Generated MP4 files remain under `Videos/`. The database records their relative path and hash with `tracked: false`, avoiding large binary commits while preserving provenance.

## Visible Browser Workflow

```bash
node tools/lala-studio-browser.mjs navigate --view world
node tools/lala-studio-browser.mjs world-story \
  --title "蓝尾纸鸟借来的桥" \
  --duration 15 \
  --place cloud-harbor-home,star-bridge-market \
  --arc fading-journey-marks \
  --hook "归还的地图页上出现一座从未见过的无窗蓝灯塔。" \
  --message "纸鸟借地图帮助困在断桥边的小云兽。"
```

After planning, run the independent writer/critic/final pipeline, explicitly apply its answer, save the story, generate references, and only then confirm one paid video submission.

## Verification

```bash
npm test
npm run build
npm run test:e2e
```

Tests cover database initialization and mutation, focused writer context, prompt continuity, desktop/mobile World views, and connected-story creation.
