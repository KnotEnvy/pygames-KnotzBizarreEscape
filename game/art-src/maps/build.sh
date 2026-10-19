#!/usr/bin/env bash
# Rebuild the maps (Mission 1 m1p1..3, Mission 2 m2p1..3): generator -> TMX -> TMJ export -> validation -> preview renders.
#   bash art-src/maps/build.sh                 every map (m1p1 m1p2 m1p3)
#   bash art-src/maps/build.sh m1p2            one map
#   bash art-src/maps/build.sh --tiles [map]   also rebuild the tilesets (stage1, m1_train, m1_lake) and strips first
# Previews go to /tmp/kbe-level/<map>/ (full map at 1x, annotated, 40-tile chunks at 2x, game-camera screens at 3x).
set -euo pipefail
GAME="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$GAME/public/assets/maps"
unset DISPLAY WAYLAND_DISPLAY PULSE_SERVER
TILES=0; MAPS=()
for a in "$@"; do if [ "$a" = "--tiles" ]; then TILES=1; else MAPS+=("$a"); fi; done
[ ${#MAPS[@]} -eq 0 ] && MAPS=(m1p1 m1p2 m1p3 m2p1 m2p2 m2p3)

if [ "$TILES" = 1 ]; then
  for t in stage1 m1_train m1_lake m2_bayou m2_boat m2_mill; do
    [ -f "$GAME/art-src/tiles/$t.lua" ] || continue
    log=$(cd "$GAME" && bash tools/build-art.sh "art-src/tiles/$t.lua" 2>&1 || true); echo "$log"
    echo "$log" | grep -q "^built $t tileset" || { echo "!! tileset $t build failed"; exit 1; }
  done
  (cd "$GAME" && bash tools/build-art.sh art-src/maps/haze.lua)
  [ -f "$GAME/art-src/maps/train_strips.lua" ] && (cd "$GAME" && bash tools/build-art.sh art-src/maps/train_strips.lua)
  [ -f "$GAME/art-src/maps/bayou_strips.lua" ] && (cd "$GAME" && bash tools/build-art.sh art-src/maps/bayou_strips.lua)
fi

for M in "${MAPS[@]}"; do
  OUT=/tmp/kbe-level/$M
  mkdir -p "$OUT"
  node "$GAME/art-src/maps/build_$M.mjs"
  TMJ="$GAME/public/assets/maps/$M.tmj"
  rm -f "$TMJ.new"
  /home/knotz2/.local/bin/tiled-headless --export-map json "$GAME/art-src/maps/$M.tmx" "$TMJ.new" 2>&1 | grep -v '^$' || true
  # Tiled can exit 0 on errors: only accept the export if it parses and has our layers and embedded tilesets.
  node -e '
const m = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const names = m.layers.map((l) => l.name).join(",");
if (names !== "bg_far_deco,back,ground,front,spawns,triggers") throw new Error("bad layers: " + names);
for (const t of m.tilesets) if (!t.tiles || t.source) throw new Error("tileset not embedded: " + t.name);' "$TMJ.new"
  mv "$TMJ.new" "$TMJ"
  echo "exported $TMJ"
  node "$GAME/art-src/maps/validate.mjs" "$TMJ"
  /home/knotz2/.local/bin/tmxrasterizer-headless --no-smoothing --hide-layer spawns --hide-layer triggers "$GAME/art-src/maps/$M.tmx" "$OUT/${M}_full.png" 2>&1 | grep -v '^$' || true
  test -s "$OUT/${M}_full.png"
  /home/knotz2/.local/bin/aseprite --batch --script-param root="$GAME" --script-param out="$OUT" --script-param map="$M" \
    --script "$GAME/art-src/maps/lib/preview.lua"
  echo "previews in $OUT"
done
