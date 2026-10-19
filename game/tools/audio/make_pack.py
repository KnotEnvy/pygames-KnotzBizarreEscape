"""Generate public/assets/packs/ui.json (Phaser pack file) for the UI/HUD/audio team's assets.
Scans: public/assets/fonts/*.xml (bitmapFont), public/assets/ui/*.json (aseprite sheets), public/assets/ui/*.png
without json (image), public/assets/ui/keyart/*.png (image, ui_keyart_<stem>), and the sfx/music manifests (audio).  Keys:
  font_<name>   bitmap fonts          ui_<sheet>   aseprite sheets (ui_icons, ui_hud, ...)
  ui_<image>    plain images          sfx key = file stem      music key = file stem
Phase G: audio keys listed in MISSION_AUDIO[n] go to packs/ui.m<n>.json (Engine loads it when a part of mission n starts); UI art
(fonts, sheets, route maps) stays in ui.json because the menus (PART SELECT, Results) need it before any mission starts.
usage: uv run --with numpy python3 -I tools/audio/make_pack.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.normpath(os.path.join(HERE, "..", "..", "public"))
ASSETS = os.path.join(PUB, "assets")


# Mission-only audio (docs/MISSION2.md § Sound keys). Everything else stays in the main pack.
MISSION_AUDIO = {
    2: {
        "music_m2p1", "music_m2p2", "music_m2p3", "music_boss_m2", "music_boss_gator",
        "shotgun_fire", "shotgun_pump", "wade_step", "mud_step", "splash_s", "splash_m", "splash_l", "splash_xl", "drown",
        "lurker_rise", "piranha_leap", "piranha_bite", "hopper_croak", "hopper_hop", "hopper_tongue", "gnat_buzz", "airboat_motor", "airboat_gun",
        "turtle_hiss", "turtle_snap", "shell_clank", "shell_spin", "egg_lob", "egg_beep",
        "skeeter_whine", "skeeter_laser", "skeeter_dive", "skeeter_drill", "larva_pop", "stinger_fire",
        "gator_roar", "gator_snap", "gator_hiss", "gator_tail", "gator_submerge", "gator_surface", "gator_roll", "gator_missile", "gator_gatling",
        "gator_gas", "gator_flame", "gator_death",
        "log_bob", "log_sink", "gas_bubble", "gas_vent", "boardwalk_creak", "boat_horn", "branch_whoosh", "paddlewheel", "mill_wheel", "thunder", "plank_break",
        # (warning_major stays in the main pack: MOOSEZILLA's banner uses it in Mission 1 too)
        "bg_herons", "bg_patrol_boat", "bg_wisps", "bg_pond_wake", "bg_gator_pod", "bg_burning_barge", "bg_skeeter_swarm", "bg_airboat_race",
        "bg_mill_creak", "bg_den_glow", "bg_gator_roar", "bg_wreck_collapse", "bg_thunder",
        "amb_swamp", "amb_rain", "amb_storm", "amb_fog", "amb_riverboat",
    },
}


def write_pack(path, section, files):
    pack = {section: {"files": files}, "meta": {"app": "Knotz Bizarre Escape", "team": "ui-audio", "generated_by": "tools/audio/make_pack.py", "version": "1.1"}}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        json.dump(pack, fh, indent=2)
    kinds = {}
    for f in files:
        kinds[f["type"]] = kinds.get(f["type"], 0) + 1
    print(f"wrote {path}: {len(files)} files {kinds}")


def main():
    files = []
    mission_files = {m: [] for m in MISSION_AUDIO}
    owner = {k: m for m, keys in MISSION_AUDIO.items() for k in keys}
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
    # key art (Image generation team drops PNGs in ui/keyart/; the Title/Results scenes use ui_keyart_<stem>)
    keyart = os.path.join(ui, "keyart")
    if os.path.isdir(keyart):
        for f in sorted(os.listdir(keyart)):
            if f.endswith(".png"):
                stem = f[:-4].replace("_bg", "")
                files.append(dict(type="image", key=f"ui_keyart_{stem}", url=f"assets/ui/keyart/{f}"))
    for kind in ("sfx", "music"):
        man = os.path.join(ASSETS, "audio", kind, f"{kind}_manifest.json")
        with open(man) as fh:
            data = json.load(fh)
        for key, info in sorted(data.items()):
            entry = dict(type="audio", key=key, url=[info["file"]])
            if key in owner:
                mission_files[owner[key]].append(entry)
            else:
                files.append(entry)
        if kind == "music":
            missing = [k for k in owner if not any(e["key"] == k for lst in mission_files.values() for e in lst)]
            if missing:
                print(f"WARNING: mission audio keys without a rendered file: {sorted(missing)}")
        # The manifest itself (peak/RMS per file): the AudioEngine's mix meter estimates bus levels from it.
        files.append(dict(type="json", key=f"{kind}_manifest", url=f"assets/audio/{kind}/{kind}_manifest.json"))
    write_pack(os.path.join(ASSETS, "packs", "ui.json"), "ui", files)
    for m, lst in mission_files.items():
        write_pack(os.path.join(ASSETS, "packs", f"ui.m{m}.json"), f"ui_m{m}", lst)


if __name__ == "__main__":
    main()
