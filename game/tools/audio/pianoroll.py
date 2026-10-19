"""Render a piano-roll PNG of a song's note events (visual check of melody/harmony/rhythm).
usage: uv run --with numpy,scipy,soundfile,pillow python3 -I tools/audio/pianoroll.py <song_key> <out.png> [bar_from bar_to]
"""
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import music as M  # noqa: E402

COLORS = {
    "lead": (255, 174, 34), "lead2": (255, 224, 102), "brass": (255, 174, 34), "brass2": (240, 224, 168), "harm": (166, 76, 196),
    "bass": (106, 162, 220), "pad": (68, 132, 60), "arp": (57, 217, 138), "bell": (255, 255, 255), "drums": (212, 72, 58),
    # Phase G tracks
    "slide": (255, 140, 60), "slide2": (255, 200, 140), "banjo": (210, 184, 120), "harp": (182, 255, 106), "choir": (168, 212, 240),
    "chug": (154, 106, 60), "organ": (166, 76, 196), "wind": (120, 120, 140),
}


def main():
    key = sys.argv[1]
    out = sys.argv[2]
    fn = M.SONGS[key][0]
    song, tracks = fn()
    b0 = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    b1 = int(sys.argv[4]) if len(sys.argv) > 4 else song.bars
    px16 = 6
    W = (b1 - b0) * 16 * px16 + 60
    lo, hi = 24, 108
    rowh = 4
    H = (hi - lo) * rowh + 80
    img = Image.new("RGB", (W, H), (18, 16, 24))
    d = ImageDraw.Draw(img)
    # bar grid
    for b in range(b0, b1 + 1):
        x = 60 + (b - b0) * 16 * px16
        d.line([(x, 0), (x, H)], fill=(60, 55, 70) if b % 4 else (120, 110, 140))
        if b % 4 == 0:
            d.text((x + 2, 2), str(b), fill=(200, 200, 220))
    for m in range(lo, hi):
        y = 20 + (hi - m) * rowh
        if m % 12 == 0:
            d.line([(60, y), (W, y)], fill=(70, 70, 90))
            d.text((2, y - 6), f"C{m // 12 - 1}", fill=(160, 160, 180))
    for tname, evs in song.events.items():
        col = COLORS.get(tname, (200, 200, 200))
        for start16, len16, midi, vel in evs:
            if start16 < b0 * 16 or start16 >= b1 * 16:
                continue
            x0 = 60 + (start16 - b0 * 16) * px16
            if tname == "drums":
                y = H - 50 + {36: 0, 38: -6, 42: -12, 46: -12, 49: -18, 45: -24, 47: -26, 50: -28, 51: -16, 37: -6}.get(midi, -30)
                d.rectangle([x0, y, x0 + 3, y + 3], fill=col)
                continue
            y = 20 + (hi - midi) * rowh
            d.rectangle([x0, y, x0 + max(2, len16 * px16 - 1), y + rowh - 1], fill=col)
    # legend
    lx = 64
    for tname in song.events:
        d.rectangle([lx, H - 12, lx + 8, H - 4], fill=COLORS.get(tname, (200, 200, 200)))
        d.text((lx + 10, H - 14), tname, fill=(220, 220, 220))
        lx += 70
    img.save(out)
    print(out, img.size)


if __name__ == "__main__":
    main()
