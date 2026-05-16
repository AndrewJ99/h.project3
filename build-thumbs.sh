#!/usr/bin/env bash
# build-thumbs.sh — keep images/thumbs/ in sync with images/.
# Run this any time you add, remove, or replace a photo:
#     ./build-thumbs.sh
#
# Idempotent: thumbs that already exist and are newer than their source are
# skipped, and thumbs whose source has been deleted are removed.

set -euo pipefail
cd "$(dirname "$0")"

shopt -s nullglob nocaseglob

mkdir -p images/thumbs

made=0; skipped=0
for f in images/*.jpg images/*.jpeg; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  out="images/thumbs/$base"
  if [ -f "$out" ] && [ "$out" -nt "$f" ]; then
    skipped=$((skipped+1))
    continue
  fi
  sips -Z 800 -s formatOptions 75 "$f" --out "$out" > /dev/null
  made=$((made+1))
done

# remove orphan thumbnails whose source photo has been deleted
removed=0
for t in images/thumbs/*.jpg images/thumbs/*.jpeg; do
  [ -f "$t" ] || continue
  src="images/$(basename "$t")"
  if [ ! -f "$src" ]; then
    rm "$t"
    removed=$((removed+1))
  fi
done

echo "Thumbnails: $made new · $skipped unchanged · $removed orphans removed"
