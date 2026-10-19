"""KBE sound-effect library: every SFX is synthesized here (no samples) and written as OGG. Phase E adds the train, ice, laser, mid-boss, hound, Buzzard and radio keys;
Phase F adds the WARNING siren, HUD ticks, weapon layers, the bg_* background moments and the amb_* section beds.
usage: uv run --with numpy,scipy,soundfile,pillow python3 -I tools/audio/sfx.py [--wav] [names...]
Output: public/assets/audio/sfx/<key>.ogg + sfx_manifest.json (duration/peak/rms/loop per key).
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kbe_synth as S  # noqa: E402
from kbe_synth import (adsr, bandpass, biquad, decay, declick, distort, expsweep, filter_sweep, highpass,  # noqa: E402
                       lin, linsweep, lowpass, mix, n, nf, noise, perc, place, pulse, reverb, saw, sine, square, t, tri)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "public", "assets", "audio", "sfx"))

# ----------------------------------------------------------------- building blocks
def burst(dur, tau, lp=None, hp=None, color="white", attack=0.001, lp_sweep=None, q=0.707):
    x = noise(dur, color)
    if lp_sweep:
        x = filter_sweep(x, "lp", expsweep(dur, *lp_sweep), q)
    elif lp:
        x = lowpass(x, lp, q)
    if hp:
        x = highpass(x, hp)
    return x * perc(dur, attack, tau)


def thump(dur, f0, f1, tau, attack=0.001, drive=1.0):
    x = sine(expsweep(dur, f0, f1), dur) * perc(dur, attack, tau)
    return distort(x, drive) if drive > 1 else x


def ring(dur, freqs, tau, gains=None):
    out = np.zeros(n(dur))
    for i, f in enumerate(freqs):
        g = 1.0 if gains is None else gains[i]
        out += sine(f, dur) * decay(dur, tau * (0.7 + 0.3 / (i + 1))) * g
    return out * perc(dur, 0.0005, tau) / len(freqs)


def formant(x, centers=(650, 1100, 2600), q=6.0, gains=(1.0, 0.7, 0.3)):
    out = np.zeros_like(x)
    for f, g in zip(centers, gains):
        out += bandpass(x, f, q) * g
    return out


def blip(dur, f0, f1, wave=square, duty=0.5, tau=None):
    f = expsweep(dur, f0, f1)
    x = wave(f, dur, duty) if wave is square else wave(f, dur)
    return x * (perc(dur, 0.002, tau) if tau else adsr(dur, 0.003, 0.02, 0.8, 0.03))


def arp(notes, step, wave=pulse, duty=0.25, tau=0.09, gap=0.0):
    ev = []
    for i, nm in enumerate(notes):
        d = step + 0.12
        x = wave(nf(nm), d, duty) if wave in (pulse, square) else wave(nf(nm), d)
        ev.append((i * step, x * perc(d, 0.002, tau)))
    return place(ev)


def loopify(x, xf=0.03):
    """Crossfade the tail into the head so the sound loops seamlessly."""
    k = n(xf)
    if len(x) <= 2 * k:
        return x
    head, tail = x[:k], x[-k:]
    w = np.linspace(0, 1, k)
    out = x[:-k].copy()
    out[:k] = head * w + tail * (1 - w)
    return out


def periodic(events, dur, xf):
    """Place `events` (offset, signal[, gain]) at t and t + dur over dur + xf seconds, so loopify(x, xf) yields an exact
    `dur`-second loop whose crossfade blends matching content (the tail already contains the next period's head)."""
    ev = list(events) + [(e[0] + dur, *e[1:]) for e in events]
    return place(ev, total=dur + xf)[:n(dur + xf)]


def vib(dur, rate, depth, delay=0.0):
    return 1 + depth * sine(rate, dur) * lin(dur, [(0, 0), (delay, 0), (delay + 0.08, 1)])


# ----------------------------------------------------------------- weapons
def pistol():
    crack = burst(0.09, 0.012, hp=1400, lp=9000, attack=0.0005)
    snap = burst(0.03, 0.004, hp=4000, attack=0.0002) * 0.8
    body = thump(0.12, 240, 70, 0.022, drive=1.8)
    x = mix(crack * 1.1, snap, body * 0.7)
    x = distort(x, 1.6)
    x = biquad(x, "peak", 2500, 1.2, 4)
    return declick(x)


def hmg():
    crack = burst(0.055, 0.008, hp=900, lp=7000, attack=0.0003)
    body = thump(0.07, 300, 110, 0.018, drive=2.0)
    mid = bandpass(noise(0.05), 1200, 2.0) * perc(0.05, 0.0005, 0.01)
    x = mix(crack, body * 0.8, mid * 0.7)
    x = distort(x, 1.8)
    return declick(x, 1.5)


def spread():
    boom = thump(0.3, 180, 45, 0.08, drive=2.5)
    blast = burst(0.28, 0.05, lp_sweep=(6000, 500), attack=0.0005)
    crunch = distort(burst(0.1, 0.02, hp=600, lp=4000), 3.0, "hard")
    x = mix(boom, blast * 1.1, crunch * 0.5)
    return declick(reverb(x, 0.3, 0.12))


def rocket_launch():
    fwoomp = burst(0.35, 0.09, lp_sweep=(2500, 300), attack=0.004)
    low = thump(0.3, 140, 60, 0.1)
    whoosh = filter_sweep(noise(0.45), "bp", expsweep(0.45, 300, 1800), 3.0) * lin(0.45, [(0, 0), (0.08, 1), (0.45, 0)])
    ignite = burst(0.06, 0.01, hp=2500) * 0.5
    x = mix(fwoomp, low * 0.9, whoosh * 0.8, ignite)
    return declick(x)


def rocket_whoosh():
    dur = 0.6
    wob = 700 + 250 * sine(2.3, dur)
    x = filter_sweep(noise(dur), "bp", wob, 2.0)
    x += lowpass(noise(dur, "brown"), 150) * 1.2
    x += sine(90 + 10 * sine(3.1, dur), dur) * 0.15
    return declick(loopify(x * 0.6, 0.06), 2)


def flame_start():
    x = mix(burst(0.3, 0.07, lp_sweep=(3000, 600), color="pink", attack=0.01), thump(0.2, 110, 60, 0.07) * 0.6)
    return declick(x)


def flame_loop():
    dur = 0.8
    base = lowpass(noise(dur, "pink"), 1800)
    crackle = np.zeros(n(dur))
    idx = S._rng.integers(0, n(dur), 90)
    crackle[idx] = S._rng.uniform(0.3, 1.0, 90) * np.sign(S._rng.standard_normal(90))
    crackle = lowpass(crackle, 4000) * 0.6
    am = 0.8 + 0.2 * sine(7.3, dur) * sine(11.1, dur)
    x = (base + crackle) * am
    x += lowpass(noise(dur, "brown"), 120) * 0.7
    return declick(loopify(x * 0.5, 0.08), 2)


def grenade_throw():
    x = filter_sweep(noise(0.25), "bp", np.concatenate([expsweep(0.12, 400, 2600), expsweep(0.13, 2600, 700)]), 2.5)
    x *= lin(0.25, [(0, 0), (0.1, 1), (0.25, 0)])
    return declick(x)


def grenade_bounce():
    x = mix(ring(0.14, [880, 1320, 2100], 0.03, [1, 0.6, 0.3]), burst(0.03, 0.005, hp=2000) * 0.5, thump(0.06, 200, 120, 0.02) * 0.4)
    return declick(x)


def explo(dur, f0, f1, tau_lo, tau_noise, drive, rumble=0.0, big=False):
    sub = thump(dur, f0, f1, tau_lo, drive=drive)
    body = burst(dur, tau_noise, lp_sweep=(4500, 250), attack=0.002)
    crunch = distort(burst(min(dur, 0.25), 0.05, hp=300, lp=5000, attack=0.001), 4.0, "hard") * 0.5
    x = mix(sub * 1.1, body, crunch)
    if rumble > 0:
        r = lowpass(noise(dur, "brown"), 110) * decay(dur, tau_lo * 2.5) * rumble
        x = mix(x, r)
    if big:
        crackle = np.zeros(n(dur))
        idx = S._rng.integers(n(0.05), n(dur), 60)
        crackle[idx] = S._rng.uniform(0.2, 1.0, 60)
        crackle = lowpass(crackle, 3000) * decay(dur, tau_noise * 2) * 0.6
        x = mix(x, crackle)
    x = distort(x, 1.4)
    return declick(reverb(x, 0.4 if not big else 0.7, 0.18 if not big else 0.25))


def explo_s():
    return explo(0.5, 160, 40, 0.09, 0.08, 2.0)


def explo_m():
    return explo(0.9, 120, 32, 0.16, 0.14, 2.5, rumble=0.5)


def explo_l():
    return explo(1.5, 90, 26, 0.28, 0.22, 3.0, rumble=0.9, big=True)


def explo_xl():
    x = explo(2.3, 70, 22, 0.45, 0.35, 3.5, rumble=1.2, big=True)
    second = explo(1.2, 110, 30, 0.2, 0.18, 2.5, rumble=0.5)
    return declick(place([(0, x), (0.18, second, 0.7)]))


# ----------------------------------------------------------------- impacts
def impact_dirt():
    return declick(mix(burst(0.08, 0.02, lp=900, attack=0.001), thump(0.07, 120, 60, 0.02) * 0.8))


def impact_metal():
    return declick(mix(ring(0.12, [2300, 3500, 5100], 0.025, [1, 0.6, 0.4]), burst(0.03, 0.004, hp=5000) * 0.8))


def impact_wood():
    return declick(mix(bandpass(noise(0.06), 900, 3.0) * perc(0.06, 0.001, 0.012), thump(0.07, 320, 150, 0.015) * 0.7))


def impact_body():
    return declick(mix(bandpass(noise(0.08), 450, 2.0) * perc(0.08, 0.002, 0.02), thump(0.09, 160, 70, 0.03) * 0.8))


def shield_tink():
    x = mix(ring(0.2, [3100, 4700, 6200], 0.05, [1, 0.5, 0.3]), burst(0.02, 0.003, hp=6000) * 0.6)
    return declick(x)


def melee_slash():
    whoosh = filter_sweep(noise(0.18), "bp", expsweep(0.18, 500, 3500), 2.0) * lin(0.18, [(0, 0), (0.05, 1), (0.18, 0)])
    shing = sine(expsweep(0.12, 2400, 5200), 0.12) * perc(0.12, 0.001, 0.03) * 0.25
    return declick(mix(whoosh, shing))


def melee_hit():
    x = mix(burst(0.12, 0.03, lp=1500, attack=0.001), thump(0.15, 170, 55, 0.05, drive=1.5), impact_body() * 0.6)
    return declick(x)


# ----------------------------------------------------------------- player
def jump():
    x = blip(0.14, 280, 640, square, 0.5) * 0.6
    x = lowpass(x, 3500)
    return declick(x * lin(0.14, [(0, 1), (0.14, 0)]))


def land():
    return declick(mix(burst(0.09, 0.025, lp=700), thump(0.08, 130, 60, 0.03) * 0.9))


def pickup():
    return declick(arp(["e6", "b6"], 0.07, pulse, 0.5, 0.08))


def pickup_bombs():
    x = mix(thump(0.08, 500, 250, 0.02), ring(0.2, [1900, 2900], 0.05)) * 0.8
    return declick(place([(0, x), (0.09, arp(["g5", "d6"], 0.07, pulse, 0.5, 0.08), 0.8)]))


def weapon_get():
    chord = arp(["c5", "e5", "g5", "c6", "e6"], 0.045, pulse, 0.25, 0.25)
    whoosh = filter_sweep(noise(0.35), "bp", expsweep(0.35, 400, 4000), 1.5) * lin(0.35, [(0, 0), (0.1, 1), (0.35, 0)]) * 0.5
    hit = mix(thump(0.25, 220, 80, 0.06, drive=1.5), burst(0.12, 0.03, hp=800, lp=6000))
    x = place([(0, whoosh), (0.08, chord), (0.3, hit, 0.9)])
    return declick(reverb(x, 0.4, 0.15))


def player_death():
    dur = 0.7
    f = expsweep(dur, 700, 140) * vib(dur, 9, 0.06)
    x = square(f, dur, 0.4) * adsr(dur, 0.005, 0.1, 0.6, 0.3)
    x = lowpass(x, 3000) * 0.6
    x = mix(x, burst(0.2, 0.05, lp=2000) * 0.5, thump(0.3, 150, 50, 0.1))
    return declick(x)


def respawn():
    return declick(arp(["c5", "e5", "g5", "c6", "e6", "g6"], 0.05, pulse, 0.25, 0.14))


def one_up():
    return declick(arp(["e5", "g5", "e6", "c6", "d6", "g6"], 0.065, square, 0.5, 0.1))


# ----------------------------------------------------------------- POW / enemies
def voice(dur, f_curve, vowel=(650, 1100, 2600), duty=0.3, vrate=6.0, vdepth=0.02):
    f = f_curve * vib(dur, vrate, vdepth, 0.05)
    x = pulse(f, dur, duty)
    x = formant(x, vowel, 5.0)
    return x * adsr(dur, 0.01, 0.05, 0.8, 0.06)


def pow_freed():
    s1 = voice(0.17, expsweep(0.17, 330, 290), (600, 1000, 2500))          # "tha-"
    s2 = voice(0.3, np.concatenate([expsweep(0.1, 270, 300), expsweep(0.2, 300, 420)]), (400, 900, 2300))  # "-nk you!"
    x = place([(0, s1), (0.2, s2)])
    return declick(lowpass(x, 5000))


def pow_salute():
    return declick(voice(0.12, expsweep(0.12, 280, 360), (500, 1200, 2500)) * 0.8)


def enemy_alert():
    x = blip(0.1, 900, 1500, square, 0.5, 0.05)
    tick = burst(0.02, 0.003, hp=3000) * 0.5
    return declick(place([(0, tick), (0.01, x)]))


def enemy_death_v(base):
    dur = 0.38
    f = np.concatenate([expsweep(0.08, base, base * 1.8), expsweep(0.3, base * 1.8, base * 0.55)])
    x = voice(dur, f, (700, 1300, 2800), 0.35, 11.0, 0.05)
    return declick(mix(x, thump(0.1, 200, 90, 0.03) * 0.3))


def enemy_death_1():
    return enemy_death_v(420)


def enemy_death_2():
    return enemy_death_v(500)


def enemy_death_3():
    return enemy_death_v(360)


def enemy_shoot():
    crack = burst(0.07, 0.012, hp=700, lp=5000)
    body = thump(0.1, 200, 90, 0.025, drive=1.5)
    return declick(biquad(mix(crack, body), "peak", 1500, 1.5, 5) * 0.9)


def enemy_panic():
    ev = []
    for i in range(3):
        ev.append((i * 0.09, voice(0.07, expsweep(0.07, 520, 700), (700, 1400, 2800), 0.3) * 0.9))
    return declick(place(ev))


def turret_windup():
    dur = 0.55
    f = expsweep(dur, 180, 950)
    x = saw(f, dur) * lin(dur, [(0, 0.3), (dur, 1)])
    x = filter_sweep(x, "lp", f * 3, 1.5)
    rattle = bandpass(noise(dur), 1800, 2.0) * (0.5 + 0.5 * square(28, dur)) * 0.3
    return declick(mix(x * 0.6, rattle) * lin(dur, [(0, 0), (0.05, 1), (dur - 0.03, 1), (dur, 0)]))


def turret_fire():
    one = mix(burst(0.06, 0.01, hp=600, lp=6000), thump(0.08, 260, 100, 0.02, drive=2.0))
    return declick(place([(0, one), (0.08, one), (0.16, one)]))


def drone_buzz():
    dur = 0.5
    x = saw(118, dur) * 0.5 + saw(121.5, dur) * 0.5 + square(236, dur, 0.3) * 0.2
    x = lowpass(x, 2200)
    x += bandpass(noise(dur), 2500, 3.0) * 0.25 * (0.8 + 0.2 * sine(37, dur))
    return declick(loopify(x * 0.6, 0.05), 2)


def drone_dive():
    dur = 0.55
    x = saw(expsweep(dur, 950, 280), dur) * lin(dur, [(0, 0.5), (0.2, 1), (dur, 0)])
    return declick(lowpass(x, 3000) * 0.7)


def chute_open():
    return declick(burst(0.18, 0.05, lp=1600, color="pink", attack=0.004))


# ----------------------------------------------------------------- boss
def boss_roar():
    dur = 1.3
    growl = saw(55 * vib(dur, 4.5, 0.08), dur)
    growl = distort(formant(growl, (280, 620, 1500), 3.0, (1, 0.7, 0.3)), 3.0)
    animal = pulse(expsweep(dur, 190, 95) * vib(dur, 7, 0.09), dur, 0.35)
    animal = formant(animal, (500, 900, 2000), 4.0)
    breath = burst(dur, 0.5, lp=1500, hp=300, color="pink", attack=0.05)
    hiss = burst(0.6, 0.3, hp=3000, attack=0.1) * 0.4
    env = lin(dur, [(0, 0), (0.08, 1), (0.9, 0.9), (dur, 0)])
    x = mix(growl * 1.0, animal * 0.8, breath * 0.6) * env
    x = place([(0, x), (0.7, hiss)])
    x = distort(x, 1.3)
    return declick(reverb(x, 0.8, 0.3))


def boss_stomp():
    thud = thump(0.5, 75, 24, 0.14, drive=2.0)
    smack = burst(0.2, 0.04, lp=500, attack=0.001)
    clank = ring(0.3, [410, 640, 980], 0.07, [1, 0.6, 0.4]) * 0.5
    rumble = lowpass(noise(0.6, "brown"), 80) * decay(0.6, 0.25)
    x = mix(thud, smack, clank, rumble)
    return declick(reverb(x, 0.6, 0.2))


def boss_steam():
    dur = 1.0
    x = highpass(lowpass(noise(dur), 9000), 2200) * lin(dur, [(0, 0.3), (0.3, 1), (0.8, 0.8), (dur, 0.3)])
    return declick(loopify(x * 0.5, 0.1), 3)


def boss_hurt():
    clang = ring(0.35, [520, 790, 1240, 1900], 0.08, [1, 0.7, 0.5, 0.3])
    growl = distort(formant(saw(70 * vib(0.3, 6, 0.1), 0.3), (300, 700), 3.0), 2.5) * perc(0.3, 0.01, 0.12)
    return declick(mix(clang, growl * 0.7, burst(0.05, 0.01, hp=3000) * 0.5))


def boss_cannon():
    x = mix(burst(0.3, 0.06, lp_sweep=(5000, 400)), thump(0.35, 150, 45, 0.1, drive=2.5), blip(0.12, 900, 300, square, 0.3, 0.04) * 0.2)
    return declick(reverb(x, 0.4, 0.12))


def boss_charge():
    ev = []
    for i in range(3):
        ev.append((i * 0.22, bandpass(noise(0.14), 1100, 1.5) * perc(0.14, 0.01, 0.05)))
    rumble = lowpass(noise(1.3, "brown"), 140) * lin(1.3, [(0, 0), (0.6, 0.3), (1.3, 1.0)])
    snort = voice(0.25, expsweep(0.25, 140, 90), (300, 700, 1400), 0.4, 15, 0.1)
    ev += [(0.0, rumble), (0.65, snort, 0.8)]
    return declick(place(ev))


def boss_death():
    dur = 2.4
    f = expsweep(dur, 210, 28) * vib(dur, 5.5, 0.07)
    fall = distort(formant(saw(f, dur), (350, 800), 3.0), 2.0) * lin(dur, [(0, 1), (1.8, 0.8), (dur, 0)])
    sparks = np.zeros(n(dur))
    idx = S._rng.integers(0, n(dur), 40)
    sparks[idx] = S._rng.uniform(0.3, 1.0, 40)
    sparks = highpass(lowpass(sparks, 6000), 1500) * 0.5
    x = mix(fall * 0.8, sparks)
    x = place([(0, x), (dur - 0.3, explo_m(), 0.9)])
    return declick(reverb(x, 0.8, 0.3))


# ----------------------------------------------------------------- environment / props
def steam_hiss():
    return declick(burst(0.6, 0.18, hp=1800, lp=9000, attack=0.01))


def crate_break():
    ev = [(0, thump(0.1, 220, 90, 0.03) * 0.8)]
    for i, f in enumerate((700, 1100, 900, 1300)):
        ev.append((0.02 + i * 0.045, bandpass(noise(0.08), f, 3.0) * perc(0.08, 0.001, 0.02) * 0.9))
    return declick(place(ev))


def gate_smash():
    x = mix(burst(0.6, 0.12, lp_sweep=(3000, 300), attack=0.001), thump(0.5, 110, 30, 0.15, drive=2.0),
            ring(0.9, [480, 730, 1150], 0.2, [1, 0.6, 0.4]) * 0.6)
    return declick(reverb(x, 0.6, 0.22))


def checkpoint():
    return declick(arp(["g5", "c6"], 0.12, tri, 0.5, 0.2))


# ----------------------------------------------------------------- UI / stingers
def ui_move():
    return declick(square(1200, 0.035, 0.5) * perc(0.035, 0.001, 0.015) * 0.6)


def ui_select():
    return declick(arp(["c6", "g6"], 0.06, square, 0.5, 0.06))


def ui_back():
    return declick(arp(["g5", "c5"], 0.06, square, 0.5, 0.06))


def ui_pause():
    x = (square(nf("a5"), 0.18, 0.5) + square(nf("e6"), 0.18, 0.5)) * perc(0.18, 0.001, 0.05) * 0.5
    return declick(x)


def ui_unpause():
    x = (square(nf("e6"), 0.14, 0.5) + square(nf("a5"), 0.14, 0.5)) * perc(0.14, 0.001, 0.04) * 0.5
    return declick(place([(0, x), (0.06, arp(["a6"], 0.05, square, 0.5, 0.05))]))


def ui_start():
    chord = sum(pulse(nf(nm), 0.5, 0.25) for nm in ("c5", "e5", "g5", "c6")) / 4 * adsr(0.5, 0.002, 0.15, 0.4, 0.2)
    whoosh = filter_sweep(noise(0.4), "bp", expsweep(0.4, 300, 5000), 1.5) * lin(0.4, [(0, 0), (0.15, 1), (0.4, 0)]) * 0.4
    return declick(reverb(mix(chord, whoosh, thump(0.2, 200, 80, 0.05) * 0.7), 0.4, 0.15))


def continue_tick():
    x = mix(bandpass(noise(0.04), 2500, 4.0) * perc(0.04, 0.0005, 0.008), sine(1000, 0.03) * perc(0.03, 0.0005, 0.006) * 0.5)
    return declick(x)


def continue_final():
    x = mix(thump(0.5, 160, 40, 0.15, drive=2.0), square(expsweep(0.5, 440, 110), 0.5, 0.5) * decay(0.5, 0.2) * 0.4)
    return declick(reverb(x, 0.5, 0.2))


def mission_start():
    ev = []
    for i, nm in enumerate(("e4", "g4", "b4")):
        stab = sum(saw(nf(x) * d, 0.22) for x in (nm,) for d in (0.995, 1.0, 1.005)) / 3
        ev.append((i * 0.13, lowpass(stab, 3000) * perc(0.22, 0.005, 0.08)))
    chord = sum(saw(nf(nm) * d, 0.9) for nm in ("e4", "b4", "e5", "g5") for d in (0.994, 1.006)) / 8
    chord = lowpass(chord, 3500) * adsr(0.9, 0.01, 0.3, 0.5, 0.3)
    roll = np.zeros(n(0.4))
    for i in range(12):
        s = n(i * 0.032)
        hit = burst(0.05, 0.015, lp=5000, hp=300) * (0.3 + 0.7 * i / 11)
        roll[s:s + len(hit)] += hit[:len(roll) - s]
    ev += [(0.0, roll * 0.7), (0.4, chord), (0.4, explo_s(), 0.5)]
    return declick(reverb(place(ev), 0.5, 0.2))


def mission_complete():
    ev = []
    for i, nm in enumerate(("e5", "g#5", "b5", "e6")):
        x = sum(pulse(nf(nm) * d, 0.16, 0.3) for d in (0.996, 1.004)) / 2
        ev.append((i * 0.1, lowpass(x, 5000) * perc(0.16, 0.003, 0.06)))
    chord = sum(saw(nf(nm) * d, 0.9) for nm in ("e4", "g#4", "b4", "e5") for d in (0.994, 1.006)) / 8
    ev.append((0.4, lowpass(chord, 4000) * adsr(0.9, 0.01, 0.3, 0.6, 0.35)))
    ev.append((0.4, burst(0.5, 0.2, hp=4000) * 0.3))
    return declick(reverb(place(ev), 0.5, 0.2))


def game_over():
    dur = 1.1
    f = np.concatenate([expsweep(0.25, nf("e5"), nf("e5")), expsweep(0.25, nf("d5"), nf("d5")), expsweep(0.6, nf("c5"), nf("b4") * 0.97)])
    x = pulse(f * vib(dur, 5, 0.03), dur, 0.4) * lin(dur, [(0, 0), (0.02, 1), (0.9, 0.8), (dur, 0)])
    return declick(reverb(lowpass(x, 3000) * 0.6, 0.6, 0.25))


def callout():
    whoosh = filter_sweep(noise(0.3), "bp", expsweep(0.3, 6000, 400), 1.2) * lin(0.3, [(0, 0), (0.1, 1), (0.3, 0)])
    slam = mix(thump(0.25, 180, 60, 0.07, drive=1.8), burst(0.1, 0.03, lp=3000))
    return declick(place([(0, whoosh * 0.6), (0.22, slam)]))


def score_tally():
    return declick(square(2000, 0.025, 0.5) * perc(0.025, 0.0005, 0.01) * 0.5)


def rank_stamp():
    x = mix(thump(0.3, 140, 50, 0.08, drive=2.0), burst(0.15, 0.04, lp=2500), ring(0.3, [900, 1400], 0.06) * 0.4)
    return declick(reverb(x, 0.4, 0.15))


# ----------------------------------------------------------------- Phase E: train (Part II)
def _clack(gain=1.0):
    """One rail-joint clack: metallic thud + short ring + click."""
    x = mix(thump(0.07, 420, 170, 0.018, drive=1.6), ring(0.11, [880, 1350, 2100], 0.025, [1, 0.5, 0.3]) * 0.6,
            burst(0.025, 0.004, hp=1800, lp=7000) * 0.7)
    return declick(x) * gain


def train_clack():
    """Seamless 1.6 s loop (4 beats at 150 BPM): two bogies per car -> 'ka-CLACK ... ka-CLACK', rolling rumble, rail hiss."""
    dur, xf = 1.6, 0.05
    ev = []
    for car in (0.0, 0.8):
        ev.append((car, _clack(1.0)))
        ev.append((car + 0.11, _clack(0.75)))
    clacks = periodic(ev, dur, xf)
    d = dur + xf
    rumble = lowpass(noise(d, "brown"), 180) * (0.8 + 0.2 * sine(1.25, d))
    hiss = bandpass(noise(d), 2600, 1.2) * (0.6 + 0.4 * sine(2.5, d) ** 2) * 0.25
    body = lowpass(noise(d, "pink"), 500) * 0.4
    x = mix(clacks * 1.2, rumble * 1.1, hiss, body)
    return declick(loopify(x * 0.5, xf), 2)


def train_horn():
    """Two-tone diesel air horn, 1.4 s."""
    dur = 1.4
    env = lin(dur, [(0, 0), (0.06, 1), (1.05, 0.95), (dur, 0)])
    x = np.zeros(n(dur))
    for f, g in ((311.1, 1.0), (370.0, 0.8), (466.2, 0.55)):
        fr = f * vib(dur, 5.2, 0.004, 0.2) * lin(dur, [(0, 0.985), (0.08, 1.0), (1.1, 1.0), (dur, 0.97)])
        x += (saw(fr, dur) * 0.6 + square(fr, dur, 0.3) * 0.4) * g
    x = formant(x, (450, 1100, 1900), 2.5, (1.0, 0.6, 0.25))
    x = distort(x, 1.4)
    breath = bandpass(noise(dur), 1500, 1.0) * 0.12
    x = mix(x, breath) * env
    return declick(reverb(x, 0.9, 0.3, 4000, 0.02))


def train_whistle():
    """Steam whistle with chiff, 1.6 s: fifth-stacked tone that sags as the steam drops."""
    dur = 1.6
    bend = lin(dur, [(0, 0.9), (0.07, 1.0), (1.25, 1.0), (dur, 0.93)])
    env = lin(dur, [(0, 0), (0.05, 1), (1.2, 0.9), (dur, 0)])
    x = np.zeros(n(dur))
    for f, g in ((932.3, 1.0), (1396.9, 0.6), (1864.7, 0.3)):
        fr = f * bend * vib(dur, 6.0, 0.006, 0.3)
        x += (sine(fr, dur) * 0.6 + tri(fr, dur) * 0.4) * g
    steam = bandpass(noise(dur), 1800, 0.8) * lin(dur, [(0, 1), (0.15, 0.25), (dur, 0.35)]) * 0.5
    chiff = burst(0.12, 0.03, hp=1200, lp=8000) * 0.8
    x = mix(x * env, steam * env, chiff)
    return declick(reverb(x, 1.0, 0.32, 5000, 0.03))


def wind():
    """Blizzard bed, seamless 2.4 s loop: LFO rates are multiples of 1/2.4 Hz so the gusts are periodic."""
    dur, xf = 2.4, 0.3
    d = dur + xf
    base = 1.0 / dur
    gust = 0.55 + 0.45 * sine(base, d, 0.3) * sine(2 * base, d, 1.1)
    low = lowpass(noise(d, "brown"), 260) * (0.7 + 0.3 * gust)
    cut = 900 + 700 * (0.5 + 0.5 * sine(base, d, 2.0))
    whistle = filter_sweep(noise(d), "bp", cut, 4.0) * gust * 0.9
    mid = lowpass(noise(d, "pink"), 1400) * (0.5 + 0.5 * gust) * 0.6
    x = mix(low, whistle, mid)
    return declick(loopify(x * 0.5, xf), 3)


def bridge_whoosh():
    """Low-bridge girder sweeping past overhead, 0.6 s: a doppler air rush (band-pass centre falls as it passes) over a
    short low thrum that pitches down, plus a brown-noise pressure wave at the closest point."""
    dur = 0.6
    env = lin(dur, [(0, 0), (0.1, 0.4), (0.22, 1.0), (0.3, 0.75), (dur, 0)])
    rush = filter_sweep(noise(dur), "bp", expsweep(dur, 2800, 380), 1.5) * env
    pressure = lowpass(noise(dur, "brown"), 240) * lin(dur, [(0, 0.1), (0.2, 1.0), (0.34, 0.5), (dur, 0)]) * 1.1
    thrum = (saw(expsweep(dur, 300, 150), dur) * 0.5 + sine(expsweep(dur, 150, 75), dur) * 0.5) * env * 0.22
    x = lowpass(mix(rush, pressure, thrum), 7000)
    return declick(x * 0.8)


# ----------------------------------------------------------------- Phase E: ice, laser (Part III, player)
def ice_crack():
    ev = []
    for i, (dt, g) in enumerate(((0.0, 1.0), (0.045, 0.7), (0.085, 0.9), (0.14, 0.5), (0.22, 0.6), (0.3, 0.35))):
        ev.append((dt, burst(0.05, 0.006, hp=700, lp=6500 - i * 400) * g))
    creak = saw(expsweep(0.35, 160, 70) * vib(0.35, 23, 0.08), 0.35)
    creak = formant(creak, (320, 760, 1500), 5.0) * perc(0.35, 0.01, 0.12) * 0.5
    body = thump(0.28, 230, 55, 0.06) * 0.6
    ev += [(0.0, creak), (0.02, body)]
    return declick(reverb(place(ev), 0.6, 0.18))


def ice_shatter():
    ev = []
    for i in range(18):
        t0 = S._rng.uniform(0.0, 0.32) * (i / 18) ** 0.6
        f = S._rng.uniform(1800, 6500)
        ev.append((t0, ring(0.16, [f, f * 1.53, f * 2.21], 0.03, [1, 0.5, 0.25]) * S._rng.uniform(0.3, 0.9)))
    crack = burst(0.06, 0.008, hp=900, lp=7000)
    thud = thump(0.3, 150, 45, 0.08, drive=1.5) * 0.8
    splash = burst(0.6, 0.18, lp_sweep=(3200, 500), color="pink", attack=0.01) * 0.6
    bubbles = place([(0.3 + i * 0.07, blip(0.05, 500 + i * 90, 900 + i * 120, sine, 0.5, 0.02) * 0.25) for i in range(5)])
    ev += [(0.0, crack), (0.0, thud), (0.1, splash), (0.0, bubbles)]
    return declick(reverb(place(ev), 0.6, 0.2))


def laser():
    dur = 0.3
    f = expsweep(dur, 2600, 320)
    x = square(f, dur, 0.35) * 0.6 + saw(f * 1.01, dur) * 0.3 + sine(f * 0.5, dur) * 0.3
    x = highpass(x, 250) * perc(dur, 0.002, 0.11)
    zap = burst(0.025, 0.004, hp=3500) * 0.7
    x = distort(mix(x, zap), 1.6)
    return declick(biquad(x, "peak", 1800, 1.0, 3))


# ----------------------------------------------------------------- Phase E: bosses and enemies
def snowcat_engine():
    """Diesel rev-up with exhaust puffs and tread rattle, 1.2 s (the plow-charge telegraph)."""
    dur = 1.2
    rpm = expsweep(dur, 28, 82)
    eng = pulse(rpm, dur, 0.18) + pulse(rpm * 2.0, dur, 0.4) * 0.5
    eng = filter_sweep(distort(eng, 2.5), "lp", expsweep(dur, 380, 1500), 1.2)
    rattle = bandpass(noise(dur), 1900, 2.5) * (0.5 + 0.5 * square(expsweep(dur, 11, 26), dur, 0.3)) * 0.35
    ev = [(0.0, eng * lin(dur, [(0, 0.5), (0.8, 1.0), (dur, 1.0)])), (0.0, rattle)]
    for i, t0 in enumerate((0.0, 0.24, 0.44, 0.6, 0.73, 0.84, 0.94, 1.03)):
        ev.append((t0, burst(0.09, 0.025, lp=1000, color="pink", attack=0.002) * (0.9 - i * 0.05)))
    x = place(ev)[:n(dur)]
    x = x * lin(dur, [(0, 0), (0.02, 1), (dur - 0.05, 1), (dur, 0)])
    return declick(x)


def snowcat_tread():
    """Seamless 0.7 s loop: 7 tread clanks at 10 Hz over a mechanical whirr and snow crunch."""
    dur, xf = 0.7, 0.04
    d = dur + xf
    ev = [(i * 0.1, mix(ring(0.08, [620, 940, 1500], 0.02, [1, 0.5, 0.3]), burst(0.02, 0.004, hp=2500) * 0.5) * (1.0 if i % 2 == 0 else 0.7)) for i in range(7)]
    clanks = periodic(ev, dur, xf)
    whirr = distort(lowpass(saw(70, d) * 0.6 + saw(140, d) * 0.3, 520), 1.8)
    crunch = lowpass(noise(d, "pink"), 2600) * (0.4 + 0.6 * (0.5 + 0.5 * sine(10, d)) ** 2) * 0.6
    x = mix(clanks * 0.7, whirr * 0.5, crunch)
    return declick(loopify(x * 0.5, xf), 2)


def mortar_thump():
    tube = bandpass(noise(0.3), 300, 4.0) * perc(0.3, 0.001, 0.07)
    thoomp = thump(0.4, 190, 55, 0.11, drive=1.8)
    exhale = burst(0.35, 0.1, lp=1300, color="pink", attack=0.005) * 0.6
    return declick(reverb(mix(tube * 1.2, thoomp, exhale), 0.5, 0.15))


def loco_steam():
    dur = 1.1
    hiss = filter_sweep(highpass(noise(dur), 1200), "lp", expsweep(dur, 9500, 2600), 0.9)
    hiss *= lin(dur, [(0, 0), (0.015, 1), (0.25, 0.75), (dur, 0)])
    whump = thump(0.25, 130, 50, 0.07) * 0.8
    return declick(mix(hiss, whump))


def loco_cannon():
    x = mix(thump(0.55, 115, 30, 0.14, drive=3.0), burst(0.45, 0.09, lp_sweep=(6000, 300), attack=0.001),
            ring(0.4, [350, 520, 790], 0.1, [1, 0.6, 0.4]) * 0.5)
    x = place([(0, x), (0.14, ring(0.12, [1200, 1900], 0.03) * 0.3)])
    return declick(reverb(distort(x, 1.3), 0.7, 0.22))


def cinder():
    dur = 0.4
    sizzle = bandpass(noise(dur), 5200, 1.5) * decay(dur, 0.12)
    sparks = np.zeros(n(dur))
    idx = S._rng.integers(0, n(dur), 18)
    sparks[idx] = S._rng.uniform(0.3, 1.0, 18)
    sparks = highpass(lowpass(sparks, 7000), 2000) * decay(dur, 0.15) * 0.6
    thud = thump(0.08, 260, 110, 0.02) * 0.5
    return declick(mix(sizzle, sparks, thud))


def hound_bark():
    dur = 0.32
    f = np.concatenate([expsweep(0.06, 210, 330), expsweep(0.26, 330, 170)])
    x = pulse(f * vib(dur, 30, 0.04), dur, 0.3)
    x = formant(x, (520, 1250, 2500), 4.0, (1.0, 0.8, 0.35))
    x = distort(x, 1.8) * adsr(dur, 0.004, 0.06, 0.6, 0.1)
    breath = bandpass(noise(dur), 2200, 1.0) * perc(dur, 0.002, 0.06) * 0.4
    return declick(mix(x, breath))


def hound_growl():
    dur = 0.8
    f = expsweep(dur, 62, 78) * vib(dur, 13, 0.12, 0.05)
    x = pulse(f, dur, 0.22) + saw(f * 2.01, dur) * 0.3
    x = formant(x, (260, 640, 1150), 4.0, (1.0, 0.7, 0.3))
    x = distort(x, 3.0) * (0.7 + 0.3 * square(26, dur, 0.5))
    x *= lin(dur, [(0, 0), (0.08, 0.7), (0.6, 1.0), (dur, 0)])
    return declick(lowpass(x, 3200))


def buzzard_rotor():
    """Seamless 0.9 s helicopter loop: 12 blade thumps (13.3 Hz) + turbine whine + wash."""
    dur, xf = 0.9, 0.06
    d = dur + xf
    per = dur / 12
    ev = [(i * per, mix(burst(0.05, 0.012, lp=420, attack=0.001), sine(58, 0.05) * perc(0.05, 0.001, 0.02) * 0.6)) for i in range(12)]
    thumps = periodic(ev, dur, xf)
    whine = lowpass(saw(1850, d) * 0.5 + saw(2780, d) * 0.3 + sine(925, d) * 0.4, 3500) * 0.12
    wash = lowpass(noise(d, "pink"), 2400) * (0.55 + 0.45 * (0.5 + 0.5 * sine(12 / dur, d)) ** 1.5) * 0.7
    x = mix(thumps, whine, wash)
    return declick(loopify(x * 0.5, xf), 2)


# ----------------------------------------------------------------- Phase E: radio / menus
def radio_blip():
    a = bandpass(square(1250, 0.07, 0.5), 1500, 1.5) * perc(0.07, 0.002, 0.03)
    b = bandpass(square(1870, 0.09, 0.5), 1900, 1.5) * perc(0.09, 0.002, 0.035)
    tick = bandpass(noise(0.03), 2500, 2.0) * perc(0.03, 0.0005, 0.008) * 0.5
    return declick(place([(0, tick), (0.01, a), (0.09, b)]) * 0.9)


def radio_static():
    dur = 0.6
    x = bandpass(noise(dur), 1900, 0.7)
    crackle = np.zeros(n(dur))
    idx = S._rng.integers(0, n(dur), 70)
    crackle[idx] = S._rng.uniform(0.3, 1.0, 70) * np.sign(S._rng.standard_normal(70))
    crackle = bandpass(crackle, 2600, 1.0) * 0.8
    x = mix(x, crackle) * lin(dur, [(0, 0), (0.01, 1), (0.22, 1), (0.3, 0.35), (0.52, 0.3), (dur, 0)])
    squelch = bandpass(noise(0.03), 3000, 2.0) * perc(0.03, 0.0005, 0.01) * 0.7
    return declick(place([(0, x), (0.53, squelch)]))


# ----------------------------------------------------------------- Phase F: WARNING siren, HUD ticks, weapon layers
def warning_siren():
    """Metal Slug-style boss WARNING klaxon, 2.0 s: two 'woop' sweeps (rising saw+square through a resonant formant) with
    a hard-edged alarm buzz underneath; the second woop is slightly higher so the pair reads as rising urgency."""
    dur = 2.0
    out = np.zeros(n(dur))
    for i, (start, f0, f1) in enumerate(((0.0, 380, 820), (0.95, 420, 900))):
        d = 0.9
        f = expsweep(d, f0, f1)
        x = saw(f, d) * 0.55 + square(f * 1.002, d, 0.4) * 0.45
        x = formant(x, (700, 1500, 2600), 3.0, (1.0, 0.7, 0.35))
        x = distort(x, 1.8) * lin(d, [(0, 0), (0.03, 1), (0.75, 0.95), (d, 0)])
        out = place([(0, out), (start, x)], total=dur)
    buzz = square(110, dur, 0.5) * 0.18 * lin(dur, [(0, 0), (0.05, 1), (1.85, 1), (dur, 0)])
    buzz = lowpass(buzz, 900)
    x = mix(out, buzz)
    return declick(reverb(x, 0.7, 0.18, 4500, 0.015))


def ammo_click():
    """Soft low-ammo tick, 50 ms: a damped wooden click (HUD, under everything)."""
    x = mix(thump(0.04, 900, 500, 0.008), burst(0.03, 0.005, hp=1500, lp=5000) * 0.6)
    return declick(x)


def combo_sting():
    """Multi-kill callout sting, 0.28 s: two quick ascending pulse notes with a bright tick (detuned per tier in code)."""
    a = pulse(nf("a5"), 0.12, 0.25) * perc(0.12, 0.002, 0.05)
    b = pulse(nf("e6"), 0.18, 0.25) * perc(0.18, 0.002, 0.08)
    tick = bandpass(noise(0.03), 4200, 2.0) * perc(0.03, 0.0005, 0.008) * 0.6
    x = place([(0, tick), (0.0, a), (0.08, b)])
    return declick(lowpass(x, 9000) * 0.9)


def hmg_punch():
    """HMG low layer, 80 ms: a sub thump (120 -> 55 Hz) and a mechanical bolt click. Plays under `hmg`."""
    sub = thump(0.08, 120, 55, 0.03, drive=1.6)
    bolt = burst(0.02, 0.004, hp=2500, lp=8000) * 0.5
    return declick(mix(sub, bolt))


def laser_tail():
    """Laser sizzle layer, 0.28 s: a falling FM whine with a high crackle, under `laser`."""
    dur = 0.28
    f = expsweep(dur, 2600, 700)
    whine = sine(f + 90 * sine(55, dur), dur) * perc(dur, 0.002, 0.09)
    crackle = bandpass(noise(dur), 5200, 1.5) * perc(dur, 0.001, 0.05) * 0.5
    return declick(highpass(mix(whine, crackle), 500) * 0.8)


def rocket_punch():
    """Rocket launch low layer, 0.4 s: an ignition boom (90 -> 40 Hz) with a crackling propellant flash."""
    dur = 0.4
    boom = thump(dur, 90, 40, 0.14, drive=2.0)
    flash = burst(0.18, 0.05, lp=2500, color="pink") * 0.6
    return declick(mix(boom, flash))


def flame_crackle():
    """Flame crackle layer, 0.5 s: random popping embers over a soft roar; gated to one per 300 ms while the trigger is held."""
    dur = 0.5
    pops = np.zeros(n(dur))
    idx = S._rng.integers(0, n(dur) - 200, 26)
    for i in idx:
        k = int(S._rng.integers(40, 200))
        pops[i:i + k] += S._rng.uniform(0.3, 1.0) * np.sign(S._rng.standard_normal()) * decay(k / S.SR, 0.004)[:k]
    pops = bandpass(pops, 2200, 0.9)
    roar = lowpass(noise(dur, "pink"), 700) * lin(dur, [(0, 0), (0.05, 1), (0.35, 0.8), (dur, 0)]) * 0.5
    return declick(mix(pops, roar))


# ----------------------------------------------------------------- Phase F: background moments (distant: filtered, quiet)
def _far(x, lp=1400, size=1.0, wet=0.35):
    """Distance treatment: low-pass + big reverb."""
    return reverb(lowpass(x, lp), size, wet, 2500, 0.04)


def bg_zeppelin():
    """Regime zeppelin drifting across the far sky, 4.5 s: slow twin-prop drone with a beating detune, swell in and out."""
    dur = 4.5
    env = lin(dur, [(0, 0), (1.2, 1), (3.3, 0.9), (dur, 0)])
    drone = saw(58, dur) * 0.5 + saw(58.7, dur) * 0.5 + sine(29, dur) * 0.6
    drone = lowpass(drone, 420) * (0.85 + 0.15 * sine(1.4, dur))
    wash = lowpass(noise(dur, "brown"), 300) * 0.5
    return declick(_far(mix(drone, wash) * env, 900, 1.0, 0.3))


def bg_plane():
    """Transport plane flyover, 3.5 s: a doppler prop drone (pitch falls as it passes) under a broadband rush."""
    dur = 3.5
    env = lin(dur, [(0, 0), (1.1, 0.8), (1.7, 1), (2.6, 0.7), (dur, 0)])
    f = expsweep(dur, 96, 64)
    props = saw(f, dur) * 0.5 + saw(f * 1.01, dur) * 0.3 + square(f * 2, dur, 0.3) * 0.25
    props = filter_sweep(props, "lp", expsweep(dur, 1600, 600), 0.9)
    rush = filter_sweep(noise(dur, "pink"), "lp", expsweep(dur, 2400, 500), 0.7) * 0.6
    return declick(_far(mix(props, rush) * env, 2000, 0.9, 0.3))


def bg_train_pass():
    """Enemy armored train roaring past on a parallel track, 3.6 s: rumble swell, clacks that speed through, horn fragment."""
    dur = 3.6
    env = lin(dur, [(0, 0), (0.9, 0.7), (1.6, 1), (2.6, 0.8), (dur, 0)])
    ev, tt = [], 0.25
    while tt < dur - 0.2:
        ev.append((tt, _clack(0.8)))
        tt += 0.19
    clacks = place(ev, total=dur)
    rumble = lowpass(noise(dur, "brown"), 160) * 1.3
    hiss = bandpass(noise(dur), 1800, 1.0) * 0.3
    horn = (saw(311, 0.9) * 0.6 + square(370, 0.9, 0.3) * 0.4) * lin(0.9, [(0, 0), (0.06, 1), (0.7, 0.9), (0.9, 0)])
    horn = lowpass(formant(horn, (450, 1100, 1900), 2.5), 1800) * 0.35
    x = mix(clacks, rumble, hiss) * env
    x = place([(0, x), (1.3, horn)], total=dur)
    return declick(_far(x, 1600, 1.0, 0.3))


def _caw(f0, f1, dur=0.22):
    x = pulse(expsweep(dur, f0, f1) * vib(dur, 28, 0.06), dur, 0.3)
    x = formant(x, (900, 1800, 3000), 4.0, (1.0, 0.8, 0.4))
    return x * lin(dur, [(0, 0), (0.02, 1), (0.14, 0.8), (dur, 0)])


def bg_crows():
    """Crows bursting from the far pines, 1.9 s: five raspy caws at random pitches plus a wing-flap flutter."""
    dur = 1.9
    ev = []
    for i in range(5):
        f0 = float(S._rng.uniform(520, 760))
        ev.append((0.05 + i * 0.3 + float(S._rng.uniform(-0.06, 0.06)), _caw(f0, f0 * 0.78) * float(S._rng.uniform(0.6, 1.0))))
    flaps = np.zeros(n(dur))
    for i in range(12):
        k = n(0.05)
        j = n(0.1 + i * 0.12)
        if j + k < len(flaps):
            flaps[j:j + k] += (lowpass(noise(0.05, "pink"), 900) * perc(0.05, 0.004, 0.02))[:k] * 0.5
    x = mix(place(ev, total=dur), flaps)
    return declick(_far(x, 3200, 0.8, 0.3))


def bg_waterfall():
    """Waterfall and mist beside the bridge, 5 s swell: broadband water roar with a mist hiss, in and out."""
    dur = 5.0
    env = lin(dur, [(0, 0), (1.5, 1), (3.6, 0.9), (dur, 0)])
    roar = lowpass(noise(dur, "pink"), 1100) * (0.8 + 0.2 * sine(0.7, dur))
    hiss = bandpass(noise(dur), 3200, 0.9) * 0.25
    burble = filter_sweep(noise(dur, "pink"), "bp", 400 + 150 * sine(1.3, dur), 2.5) * 0.4
    return declick(lowpass(mix(roar, hiss, burble) * env, 2400))


def bg_artillery():
    """Distant artillery, 1.8 s: a soft far thud (120 -> 35 Hz) with a long low rumble tail."""
    dur = 1.8
    thud = thump(0.5, 120, 35, 0.18, drive=1.4)
    tail = lowpass(noise(dur, "brown"), 180) * lin(dur, [(0, 0), (0.08, 1), (0.6, 0.5), (dur, 0)])
    return declick(_far(mix(thud, tail), 500, 1.0, 0.4))


def bg_flak():
    """Flak bursts on the horizon, 1.4 s: three small far pops with crackle, staggered."""
    dur = 1.4
    ev = []
    for i, off in enumerate((0.0, 0.33, 0.78)):
        pop = mix(thump(0.25, 260, 70, 0.06, drive=1.3), burst(0.12, 0.03, lp=2500, color="pink") * 0.6)
        ev.append((off, pop * (0.8 if i == 1 else 1.0)))
    x = place(ev, total=dur)
    return declick(_far(x, 1200, 0.9, 0.35))


def bg_siren():
    """Far air-raid siren, 3.2 s: a slow wail rising and falling once, heavily filtered."""
    dur = 3.2
    f = 400 * (1 + 0.55 * np.sin(np.pi * np.clip(t(dur) / 2.6, 0, 1)))
    x = saw(f, dur) * 0.5 + square(f, dur, 0.4) * 0.5
    x = formant(x, (800, 1600), 3.0, (1.0, 0.5))
    env = lin(dur, [(0, 0), (0.3, 1), (2.6, 0.9), (dur, 0)])
    return declick(_far(x * env, 1300, 1.0, 0.45))


def bg_avalanche():
    """Avalanche on a far mountain, 4 s: brown-noise rumble swelling with tumbling low thuds, fading into a hiss."""
    dur = 4.0
    env = lin(dur, [(0, 0), (0.9, 0.8), (1.8, 1), (3.0, 0.6), (dur, 0)])
    rumble = lowpass(noise(dur, "brown"), 140) * 1.4
    ev = [(float(S._rng.uniform(0.4, 3.0)), thump(0.3, 80, 40, 0.1) * float(S._rng.uniform(0.3, 0.8))) for _ in range(9)]
    thuds = place(ev, total=dur)
    hiss = lowpass(noise(dur, "pink"), 1200) * lin(dur, [(0, 0), (1.5, 0.3), (2.6, 0.6), (dur, 0)]) * 0.4
    return declick(_far(mix(rumble, thuds, hiss) * env, 700, 1.0, 0.35))


def bg_tesla():
    """Tesla coil arc on a lab tower, 0.7 s: a buzzing zap with crackle and a snap, distant."""
    dur = 0.7
    buzz = square(120 * vib(dur, 50, 0.3), dur, 0.2) * perc(dur, 0.002, 0.2)
    crackle = np.zeros(n(dur))
    idx = S._rng.integers(0, n(0.45), 60)
    crackle[idx] = S._rng.uniform(0.3, 1.0, 60) * np.sign(S._rng.standard_normal(60))
    crackle = bandpass(crackle, 3500, 1.0) * 0.9
    snap = burst(0.04, 0.008, hp=2000, lp=9000)
    x = mix(buzz * 0.6, crackle, snap)
    return declick(_far(x, 3800, 0.7, 0.3))


def bg_aurora():
    """Aurora shimmer pad, 6 s: detuned sines in a wide fifth with a slow tremolo, very soft."""
    dur = 6.0
    env = lin(dur, [(0, 0), (2.0, 1), (4.2, 0.9), (dur, 0)])
    x = np.zeros(n(dur))
    for f, g in ((220.0, 1.0), (330.0, 0.6), (440.5, 0.5), (660.9, 0.35), (880.3, 0.2)):
        x += sine(f * vib(dur, 0.35, 0.004), dur) * g * (0.7 + 0.3 * sine(0.23 + g * 0.1, dur))
    shimmer = bandpass(noise(dur), 5000, 1.2) * (0.5 + 0.5 * sine(0.5, dur)) * 0.05
    x = mix(x * 0.25, shimmer) * env
    return declick(reverb(x, 1.0, 0.5, 6000, 0.05))


def bg_fissure():
    """Ice fissure booming across the far lake, 1.8 s: a cracking snap, a deep boom and a creaking tail."""
    dur = 1.8
    snap = burst(0.08, 0.015, hp=900, lp=6000)
    boom = thump(1.0, 95, 38, 0.3, drive=1.7)
    creak = pulse(expsweep(0.8, 260, 180) * vib(0.8, 22, 0.08), 0.8, 0.15)
    creak = bandpass(creak, 500, 2.0) * lin(0.8, [(0, 0), (0.05, 1), (0.6, 0.5), (0.8, 0)]) * 0.5
    x = place([(0, snap), (0.03, boom), (0.5, creak)], total=dur)
    return declick(_far(x, 1100, 1.0, 0.4))


def bg_roar():
    """MOOSEZILLA's distant roar behind the lab, 2.2 s: the boss roar recipe, lower, muffled and drenched in reverb."""
    x = boss_roar()
    x = resample_safe(x, 0.82)
    return declick(_far(x, 900, 1.0, 0.5))


def resample_safe(x, factor):
    try:
        return S.resample(x, factor)
    except Exception:
        return x


def bg_engine():
    """Snowcat engine roaring behind the yard gate, 2.2 s: a muffled rev-up with exhaust puffs."""
    dur = 2.2
    f = expsweep(dur, 42, 95)
    eng = saw(f, dur) * 0.5 + square(f * 0.5, dur, 0.3) * 0.5
    eng = lowpass(eng, 500) * lin(dur, [(0, 0), (0.2, 0.7), (1.3, 1), (1.9, 0.8), (dur, 0)])
    puffs = place([(0.9 + i * 0.22, burst(0.1, 0.03, lp=900, color="pink") * 0.7) for i in range(5)], total=dur)
    return declick(_far(mix(eng, puffs), 600, 0.9, 0.35))


def bg_searchlight():
    """Searchlight servo sweep, 1.6 s: a soft electric hum rising and falling, very quiet."""
    dur = 1.6
    f = 140 * (1 + 0.25 * np.sin(np.pi * t(dur) / dur))
    hum = saw(f, dur) * 0.6 + sine(f * 2, dur) * 0.4
    env = lin(dur, [(0, 0), (0.2, 1), (1.3, 0.9), (dur, 0)])
    return declick(_far(lowpass(hum, 700) * env, 1200, 0.6, 0.25))


def bg_loco():
    """Far locomotive chuffing (Ironhorn's plume ahead), 2.6 s: six steam chuffs under a low rumble."""
    dur = 2.6
    chuffs = place([(i * 0.4, burst(0.22, 0.06, lp=1400, color="pink") * (0.8 + 0.2 * (i % 2))) for i in range(6)], total=dur)
    rumble = lowpass(noise(dur, "brown"), 120) * 0.8
    env = lin(dur, [(0, 0), (0.3, 1), (2.2, 0.9), (dur, 0)])
    return declick(_far(mix(chuffs, rumble) * env, 1000, 1.0, 0.4))


# ----------------------------------------------------------------- Phase F: ambient beds (seamless loops, under the music)
def _bed(dur, xf, parts):
    x = mix(*parts)
    return declick(loopify(x * 0.5, xf), 3)


def amb_camp():
    """Prison camp bed, 3.2 s loop: cold wind, a generator hum and a distant PA buzz."""
    dur, xf = 3.2, 0.3
    d = dur + xf
    base = 1.0 / dur
    gust = 0.6 + 0.4 * sine(base, d, 0.4)
    wind = lowpass(noise(d, "brown"), 320) * gust
    gen = lowpass(square(50, d, 0.5) * 0.5 + saw(100, d) * 0.3, 400) * 0.25
    buzz = bandpass(square(60, d, 0.5), 1200, 3.0) * 0.08 * (0.7 + 0.3 * sine(2 * base, d))
    return _bed(dur, xf, (wind, gen, buzz))


def amb_forest():
    """Pine forest bed, 3.2 s loop: wind in the needles with two faint far bird chirps per period."""
    dur, xf = 3.2, 0.3
    d = dur + xf
    base = 1.0 / dur
    gust = 0.55 + 0.45 * sine(base, d, 1.0) * sine(2 * base, d, 0.5)
    pines = filter_sweep(noise(d), "bp", 900 + 500 * (0.5 + 0.5 * sine(base, d, 2.0)), 2.5) * gust * 0.8
    low = lowpass(noise(d, "brown"), 220) * 0.6
    chirp = lambda f: sine(expsweep(0.09, f, f * 1.3), 0.09) * perc(0.09, 0.003, 0.03) * 0.25
    birds = periodic([(0.7, chirp(2600)), (0.82, chirp(2900)), (2.1, chirp(2300))], dur, xf)
    birds = lowpass(birds, 4000)
    return _bed(dur, xf, (pines, low, birds))


def amb_river():
    """River bed, 3.2 s loop: water rush with a slow burble."""
    dur, xf = 3.2, 0.3
    d = dur + xf
    base = 1.0 / dur
    rush = lowpass(noise(d, "pink"), 1300) * (0.8 + 0.2 * sine(base, d))
    burble = filter_sweep(noise(d, "pink"), "bp", 380 + 160 * sine(2 * base, d), 3.0) * 0.5
    spray = bandpass(noise(d), 3000, 1.0) * 0.15
    return _bed(dur, xf, (rush, burble, spray))


def amb_outpost():
    """Regime outpost bed, 3.2 s loop: a diesel generator, a chimney draft and a faint radio carrier."""
    dur, xf = 3.2, 0.3
    d = dur + xf
    base = 1.0 / dur
    gen = lowpass(saw(45, d) * 0.6 + square(90, d, 0.4) * 0.4, 350) * (0.8 + 0.2 * sine(4 * base, d)) * 0.5
    draft = filter_sweep(noise(d, "pink"), "bp", 600 + 200 * sine(base, d), 1.5) * 0.35
    carrier = bandpass(square(1000, d, 0.5), 1000, 8.0) * 0.03
    return _bed(dur, xf, (gen, draft, carrier))


def amb_lake():
    """Frozen lake bed, 3.2 s loop: a sub-wind and slow ice creaks and pings."""
    dur, xf = 3.2, 0.3
    d = dur + xf
    base = 1.0 / dur
    sub = lowpass(noise(d, "brown"), 150) * (0.7 + 0.3 * sine(base, d)) * 0.9
    creak = lambda f0, f1: bandpass(pulse(expsweep(0.5, f0, f1) * vib(0.5, 18, 0.06), 0.5, 0.15), 450, 2.0) * lin(0.5, [(0, 0), (0.05, 1), (0.4, 0.4), (0.5, 0)]) * 0.35
    ping = lambda f: sine(f, 0.4) * perc(0.4, 0.002, 0.12) * 0.12
    ev = [(0.4, creak(220, 170)), (1.9, creak(260, 200)), (1.1, ping(1240)), (2.7, ping(980))]
    ice = periodic(ev, dur, xf)
    return _bed(dur, xf, (sub, lowpass(ice, 2500)))


def amb_lab():
    """Lab bed, 3.2 s loop: a mains hum, fluorescent buzz and a soft tesla hiss."""
    dur, xf = 3.2, 0.3
    d = dur + xf
    base = 1.0 / dur
    hum = lowpass(sine(60, d) * 0.6 + saw(120, d) * 0.3, 300) * 0.45
    fluo = bandpass(square(120, d, 0.5), 2400, 4.0) * 0.06 * (0.8 + 0.2 * sine(3 * base, d))
    hiss = bandpass(noise(d), 4200, 1.2) * (0.4 + 0.6 * (0.5 + 0.5 * sine(base, d, 1.0)) ** 3) * 0.18
    low = lowpass(noise(d, "brown"), 200) * 0.3
    return _bed(dur, xf, (hum, fluo, hiss, low))


# ----------------------------------------------------------------- catalog: key -> (fn, loudness dBFS, loop)
CATALOG = {
    # weapons
    "pistol": (pistol, -15, False), "hmg": (hmg, -16, False), "spread": (spread, -13, False),
    "rocket_launch": (rocket_launch, -13, False), "rocket_whoosh": (rocket_whoosh, -22, True),
    "flame_start": (flame_start, -16, False), "flame_loop": (flame_loop, -20, True),
    "grenade_throw": (grenade_throw, -20, False), "grenade_bounce": (grenade_bounce, -20, False),
    # explosions
    "explo_s": (explo_s, -13, False), "explo_m": (explo_m, -11, False), "explo_l": (explo_l, -9.5, False), "explo_xl": (explo_xl, -8.5, False),
    # impacts
    "impact_dirt": (impact_dirt, -22, False), "impact_metal": (impact_metal, -20, False), "impact_wood": (impact_wood, -21, False),
    "impact_body": (impact_body, -20, False), "shield_tink": (shield_tink, -18, False),
    "melee_slash": (melee_slash, -17, False), "melee_hit": (melee_hit, -14, False),
    # player
    "jump": (jump, -21, False), "land": (land, -21, False), "pickup": (pickup, -16, False), "pickup_bombs": (pickup_bombs, -16, False),
    "weapon_get": (weapon_get, -12, False), "player_death": (player_death, -12, False), "respawn": (respawn, -15, False), "one_up": (one_up, -12, False),
    # pow / enemies
    "pow_freed": (pow_freed, -15, False), "pow_salute": (pow_salute, -18, False),
    "enemy_alert": (enemy_alert, -18, False), "enemy_death_1": (enemy_death_1, -15, False), "enemy_death_2": (enemy_death_2, -15, False),
    "enemy_death_3": (enemy_death_3, -15, False), "enemy_shoot": (enemy_shoot, -18, False), "enemy_panic": (enemy_panic, -17, False),
    "turret_windup": (turret_windup, -17, False), "turret_fire": (turret_fire, -15, False),
    "drone_buzz": (drone_buzz, -24, True), "drone_dive": (drone_dive, -17, False), "chute_open": (chute_open, -20, False),
    # boss
    "boss_roar": (boss_roar, -10, False), "boss_stomp": (boss_stomp, -10, False), "boss_steam": (boss_steam, -22, True),
    "boss_hurt": (boss_hurt, -15, False), "boss_cannon": (boss_cannon, -13, False), "boss_charge": (boss_charge, -13, False), "boss_death": (boss_death, -9, False),
    # environment
    "steam_hiss": (steam_hiss, -22, False), "crate_break": (crate_break, -17, False), "gate_smash": (gate_smash, -10, False), "checkpoint": (checkpoint, -17, False),
    # ui / stingers
    "ui_move": (ui_move, -20, False), "ui_select": (ui_select, -17, False), "ui_back": (ui_back, -18, False),
    "ui_pause": (ui_pause, -17, False), "ui_unpause": (ui_unpause, -17, False), "ui_start": (ui_start, -13, False),
    "continue_tick": (continue_tick, -18, False), "continue_final": (continue_final, -12, False),
    "mission_start": (mission_start, -11, False), "mission_complete": (mission_complete, -11, False), "game_over": (game_over, -13, False),
    "callout": (callout, -14, False), "score_tally": (score_tally, -20, False), "rank_stamp": (rank_stamp, -12, False),
    # Phase E: train (Part II)
    "train_clack": (train_clack, -22, True), "train_horn": (train_horn, -13, False), "train_whistle": (train_whistle, -15, False), "wind": (wind, -26, True),
    "bridge_whoosh": (bridge_whoosh, -14, False),
    # Phase E: ice / laser
    "ice_crack": (ice_crack, -18, False), "ice_shatter": (ice_shatter, -15, False), "laser": (laser, -16, False),
    # Phase E: bosses and enemies
    "snowcat_engine": (snowcat_engine, -16, False), "snowcat_tread": (snowcat_tread, -22, True), "mortar_thump": (mortar_thump, -14, False),
    "loco_steam": (loco_steam, -16, False), "loco_cannon": (loco_cannon, -12, False), "cinder": (cinder, -21, False),
    "hound_bark": (hound_bark, -15, False), "hound_growl": (hound_growl, -17, False), "buzzard_rotor": (buzzard_rotor, -22, True),
    # Phase E: radio / menus
    "radio_blip": (radio_blip, -18, False), "radio_static": (radio_static, -20, False),
    # Phase F: WARNING siren, HUD ticks, weapon layers
    "warning_siren": (warning_siren, -13, False), "ammo_click": (ammo_click, -24, False), "combo_sting": (combo_sting, -17, False),
    "hmg_punch": (hmg_punch, -18, False), "laser_tail": (laser_tail, -22, False), "rocket_punch": (rocket_punch, -15, False), "flame_crackle": (flame_crackle, -22, False),
    # Phase F: background moments (distant tiers)
    "bg_zeppelin": (bg_zeppelin, -24, False), "bg_plane": (bg_plane, -22, False), "bg_train_pass": (bg_train_pass, -20, False), "bg_crows": (bg_crows, -22, False),
    "bg_waterfall": (bg_waterfall, -24, False), "bg_artillery": (bg_artillery, -20, False), "bg_flak": (bg_flak, -22, False), "bg_siren": (bg_siren, -25, False),
    "bg_avalanche": (bg_avalanche, -20, False), "bg_tesla": (bg_tesla, -21, False), "bg_aurora": (bg_aurora, -28, False), "bg_fissure": (bg_fissure, -18, False),
    "bg_roar": (bg_roar, -19, False), "bg_engine": (bg_engine, -22, False), "bg_searchlight": (bg_searchlight, -28, False), "bg_loco": (bg_loco, -24, False),
    # Phase F: ambient beds (loops)
    "amb_camp": (amb_camp, -28, True), "amb_forest": (amb_forest, -28, True), "amb_river": (amb_river, -26, True),
    "amb_outpost": (amb_outpost, -28, True), "amb_lake": (amb_lake, -28, True), "amb_lab": (amb_lab, -28, True),
}


def trim_tail(x, thresh_db=-54.0, pad=0.03):
    """Cut silence/reverb tail once the envelope stays below thresh_db."""
    thr = 10 ** (thresh_db / 20)
    w = n(0.01)
    env = np.sqrt(np.convolve(np.square(x), np.ones(w) / w, mode="same"))
    above = np.nonzero(env > thr)[0]
    if len(above) == 0:
        return x
    end = min(len(x), above[-1] + n(pad))
    return x[:end]


def render(key):
    fn, loud, loop = CATALOG[key]
    S.seed(sum(ord(c) for c in key) * 7919 & 0xFFFF)
    x = fn()
    x = S.set_loudness(x, loud, 0.89)
    if not loop:
        x = declick(trim_tail(x), 1.0)
    return x.astype(np.float32), loop


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    wav = "--wav" in sys.argv
    keys = args or list(CATALOG.keys())
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for k in keys:
        x, loop = render(k)
        path = os.path.join(OUT, k + ".ogg")
        S.write_ogg(path, x, quality=0.4)
        if wav:
            S.write_wav(os.path.join("/tmp/kbe-ui/audio/wav", k + ".wav"), x)
        manifest[k] = dict(file=f"assets/audio/sfx/{k}.ogg", duration=round(len(x) / S.SR, 3), loop=loop,
                           peak_db=round(S.db(S.peak(x)), 1), rms_db=round(S.db(S.rms(x)), 1))
        print(f"{k:18} {len(x)/S.SR:5.2f}s peak {S.db(S.peak(x)):6.1f} rms {S.db(S.rms(x)):6.1f}{'  LOOP' if loop else ''}")
    S.save_manifest(os.path.join(OUT, "sfx_manifest.json"), S.merge_manifest(os.path.join(OUT, "sfx_manifest.json"), manifest, full=not args))
    print(f"wrote {len(keys)} sfx to {OUT}")


if __name__ == "__main__":
    main()
