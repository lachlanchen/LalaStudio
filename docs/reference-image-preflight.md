# Reference Image Preflight

Lala Studio can generate reusable image references before it opens the Xiaoyunque composer. This keeps visual design and text verification separate from paid video generation.

## Two Outputs

`word-card.png` is a fresh physical card based on the selected product reference. Image generation creates the frame, stand, display, materials, and lighting. `scripts/render_word_card_text.sh` then replaces only the inner screen with four exact strings from `word-card-spec.json`. Never trust image-model spelling as the final text layer.

`scene-reference.png` is an episode-specific cinematic keyframe. Its visual brief is editable in **Produce**, and its source images are selected independently from the later video-upload references. This allows a two-character scene to use only those identities without changing the normal production asset set.

## Studio Workflow

1. Save or select a story.
2. Open **Produce**.
3. Keep **Generate card with Codex first** enabled when the word card is used.
4. Enable **Generate scene keyframe first** and enter a focused visual brief.
5. Select only the references needed to design that keyframe.
6. Click **Generate reference images**.
7. Inspect both previews. Video preparation reuses the current cached PNGs and adds the scene image after the normal selected attachments.

The cache lives under the connected project's ignored `.lalastudio/generated-assets/<story-id>/` directory. A fingerprint covers the story, aspect ratio, selected assets, word-card values, and visual brief. Editing any of them invalidates the cache.

## Visible Browser Command

```bash
node tools/lala-studio-browser.mjs production \
  --message "First generate a cinematic scene keyframe, then prepare this 15 second video" \
  --operation references \
  --scene-assets raraxia,ayachan
```

This command drives the visible Studio UI. It does not call the Studio API as a substitute for UI interaction and it does not submit a Xiaoyunque video.
