#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 BASE_IMAGE OUTPUT_IMAGE WORD_CARD_SPEC.json" >&2
  exit 2
fi

base_image="$1"
output_image="$2"
spec_file="$3"

[[ -f "$base_image" ]] || { echo "Base image not found: $base_image" >&2; exit 1; }
[[ -f "$spec_file" ]] || { echo "Word-card spec not found: $spec_file" >&2; exit 1; }
command -v convert >/dev/null 2>&1 || { echo "ImageMagick convert is required" >&2; exit 3; }
command -v identify >/dev/null 2>&1 || { echo "ImageMagick identify is required" >&2; exit 3; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required" >&2; exit 3; }

mapfile -t lines < <(node -e '
  const fs = require("fs");
  const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  for (const key of ["english", "japanese", "furigana", "chinese"]) {
    const text = String(value[key] || "").trim();
    if (!text || /[\r\n]/.test(text)) process.exit(2);
    console.log(text);
  }
' "$spec_file")
[[ ${#lines[@]} -eq 4 ]] || { echo "Word-card spec must contain four single-line values" >&2; exit 2; }

read -r width height < <(identify -format '%w %h\n' "$base_image")
[[ "$width" =~ ^[0-9]+$ && "$height" =~ ^[0-9]+$ ]] || { echo "Cannot read image dimensions" >&2; exit 1; }

# The image-generation contract keeps the display front-facing and centered.
# Repaint only the inner screen, preserving the generated frame, stand, and shadows.
x1=$((width * 22 / 100))
x2=$((width * 76 / 100))
y1=$((height * 11 / 100))
y2=$((height * 64 / 100))
font_size=$((width * 43 / 1000))
furigana_size=$((width * 34 / 1000))
stroke_width=$((width / 1100 + 1))
font="$(fc-match -f '%{file}\n' 'Noto Sans CJK JP' | sed -n '1p')"
[[ -n "$font" ]] || font="DejaVu-Sans"

mkdir -p "$(dirname "$output_image")"
temporary="${output_image}.${$}.tmp.png"
trap 'rm -f "$temporary"' EXIT

convert "$base_image" \
  -fill '#f7f8f6' -stroke '#d8dad7' -strokewidth "$stroke_width" \
  -draw "roundrectangle ${x1},${y1} ${x2},${y2} 8,8" \
  -gravity north -font "$font" -fill '#111315' -stroke none \
  -pointsize "$font_size" -annotate "+0+$((height * 16 / 100))" "${lines[0]}" \
  -pointsize "$font_size" -annotate "+0+$((height * 28 / 100))" "${lines[1]}" \
  -pointsize "$furigana_size" -annotate "+0+$((height * 40 / 100))" "${lines[2]}" \
  -pointsize "$font_size" -annotate "+0+$((height * 50 / 100))" "${lines[3]}" \
  "$temporary"

mv "$temporary" "$output_image"
trap - EXIT
identify "$output_image" >/dev/null
printf 'Rendered exact word-card text: %s\n' "$output_image"
