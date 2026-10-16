"""Generate public/assets/packs/ui.json (Phaser pack file) for the UI/HUD/audio team's assets.
Scans: public/assets/fonts/*.xml (bitmapFont), public/assets/ui/*.json (aseprite sheets), public/assets/ui/*.png
without json (image), and the sfx/music manifests (audio).  Keys:
  font_<name>   bitmap fonts          ui_<sheet>   aseprite sheets (ui_icons, ui_hud, ...)
  ui_<image>    plain images          sfx key = file stem      music key = file stem
usage: uv run --with numpy python3 -I tools/audio/make_pack.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.normpath(os.path.join(HERE, "..", "..", "public"))
ASSETS = os.path.join(PUB, "assets")


def main():
    files = []
    fonts = os.path.join(ASSETS, "fonts")
    for f in sorted(os.listdir(fonts)):
        if f.endswith(".xml"):
            stem = f[:-4]
            files.append(dict(type="bitmapFont", key=f"font_{stem}", textureURL=f"assets/fonts/{stem}.png", fontDataURL=f"assets/fonts/{stem}.xml"))
    ui = os.path.join(ASSETS, "ui")
    pngs = sorted(f for f in os.listdir(ui) if f.endswith(".png"))
    for f in pngs:
        stem = f[:-4]
        if os.path.exists(os.path.join(ui, stem + ".json")):
            key = stem if stem.startswith("ui_") else f"ui_{stem}"
            files.append(dict(type="aseprite", key=key, textureURL=f"assets/ui/{f}", atlasURL=f"assets/ui/{stem}.json"))
        else:
            files.append(dict(type="image", key=f"ui_{stem}", url=f"assets/ui/{f}"))
    for kind in ("sfx", "music"):
        man = os.path.join(ASSETS, "audio", kind, f"{kind}_manifest.json")
        with open(man) as fh:
            data = json.load(fh)
        for key, info in sorted(data.items()):
            files.append(dict(type="audio", key=key, url=[info["file"]]))
    pack = {"ui": {"files": files}, "meta": {"app": "Knotz Bizarre Escape", "team": "ui-audio", "generated_by": "tools/audio/make_pack.py", "version": "1.0"}}
    out = os.path.join(ASSETS, "packs", "ui.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        json.dump(pack, fh, indent=2)
    kinds = {}
    for f in files:
        kinds[f["type"]] = kinds.get(f["type"], 0) + 1
    print(f"wrote {out}: {len(files)} files {kinds}")


if __name__ == "__main__":
    main()
