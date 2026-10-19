#!/usr/bin/env bash
# Regenerate all KBE audio (SFX + music) and the analysis report.
#   bash tools/audio/build.sh            # everything
#   bash tools/audio/build.sh sfx|music|analyze
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
RUN="uv run --with numpy,scipy,soundfile,pillow python3 -I"
what="${1:-all}"
case "$what" in
  sfx)     $RUN "$HERE/sfx.py" ;;
  music)   $RUN "$HERE/music.py" ;;
  analyze) $RUN "$HERE/analyze.py" "${2:-/tmp/kbe-ui/audio}" ;;
  all)     $RUN "$HERE/sfx.py"; $RUN "$HERE/music.py"; $RUN "$HERE/analyze.py" "${2:-/tmp/kbe-ui/audio}" ;;
  *) echo "usage: build.sh [sfx|music|analyze|all]"; exit 2 ;;
esac
