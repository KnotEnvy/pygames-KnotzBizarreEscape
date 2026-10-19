#!/usr/bin/env bash
# Build Aseprite art from Lua build scripts.
#   bash tools/build-art.sh                       # all art-src/**/*.lua (except _examples, lib/)
#   bash tools/build-art.sh art-src/player/legs.lua [more.lua ...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASE=/home/knotz2/.local/bin/aseprite
KBE="$ROOT/tools/aseprite/kbe.lua"
unset DISPLAY WAYLAND_DISPLAY PULSE_SERVER
if [ "$#" -gt 0 ]; then files=("$@"); else mapfile -t files < <(find "$ROOT/art-src" -name '*.lua' -not -path '*/_examples/*' -not -path '*/lib/*' | sort); fi
fail=0
for f in "${files[@]}"; do
  case "$f" in /*) ;; *) f="$ROOT/$f";; esac
  out=$("$ASE" --batch --script-param kbe="$KBE" --script-param root="$ROOT" --script "$f" 2>&1) || true
  echo "$out"
  if echo "$out" | grep -qiE 'error|stack traceback|attempt to'; then echo "!! FAILED: $f"; fail=1; fi
done
exit $fail
