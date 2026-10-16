#!/usr/bin/env bash
# Rebuild Mission 1: map TMX -> TMJ export -> validation -> preview renders.
#   bash art-src/maps/build.sh            (from game/)
#   bash art-src/maps/build.sh --tiles    also rebuild the tileset first
# Previews go to /tmp/kbe-level/ (full map at 1x, plus per-section crops at 2x).
set -euo pipefail
GAME="$(cd "$(dirname "$0")/../.." && pwd)"
OUT=/tmp/kbe-level
mkdir -p "$OUT" "$GAME/public/assets/maps"
unset DISPLAY WAYLAND_DISPLAY PULSE_SERVER
if [ "${1:-}" = "--tiles" ]; then
  log=$(cd "$GAME" && bash tools/build-art.sh art-src/tiles/stage1.lua 2>&1 || true); echo "$log"
  echo "$log" | grep -q '^built stage1 tileset' || { echo "!! tileset build failed"; exit 1; }
  (cd "$GAME" && bash tools/build-art.sh art-src/maps/haze.lua)
fi

node "$GAME/art-src/maps/build_stage1.mjs"
TMJ="$GAME/public/assets/maps/stage1.tmj"
rm -f "$TMJ.new"
/home/knotz2/.local/bin/tiled-headless --export-map json "$GAME/art-src/maps/stage1.tmx" "$TMJ.new" 2>&1 | grep -v '^$' || true
# Tiled can exit 0 on errors: only accept the export if it parses and has our layers.
node -e '
const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const names = m.layers.map((l) => l.name).join(",");
if (names !== "bg_far_deco,back,ground,front,spawns,triggers") throw new Error("bad layers: " + names);
if (!m.tilesets[0].tiles) throw new Error("tileset not embedded");' "$TMJ.new"
mv "$TMJ.new" "$TMJ"
echo "exported $TMJ"

node "$GAME/art-src/maps/validate.mjs" "$TMJ"

/home/knotz2/.local/bin/tmxrasterizer-headless --no-smoothing --hide-layer spawns --hide-layer triggers "$GAME/art-src/maps/stage1.tmx" "$OUT/stage1_full.png" 2>&1 | grep -v '^$' || true
test -s "$OUT/stage1_full.png"
# annotated preview (props + spawn markers) and section crops, drawn by Aseprite
/home/knotz2/.local/bin/aseprite --batch --script-param root="$GAME" --script-param out="$OUT" \
  --script "$GAME/art-src/maps/lib/preview.lua"
echo "previews in $OUT"
