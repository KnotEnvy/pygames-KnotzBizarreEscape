"""KBE music: a small tracker/sequencer that composes and renders the soundtrack offline.
usage: uv run --with numpy,scipy,soundfile,pillow python3 -I tools/audio/music.py [--wav] [song names...]
Output: public/assets/audio/music/<key>.ogg (stereo 44.1 kHz) + music_manifest.json

Pattern DSL (16th-note grid): "e5:2 r:2 g5:4 e4+g4+b4:4 a5:2*0.8"
  token = pitch[+pitch...]:length16ths[*velocity]   'r' = rest.  Patterns may span bars.
Drum grids: strings of 8 or 16 steps per bar: x hit, X accent, g ghost, o open-hat, . rest
"""
import math
import os
import sys
from collections import defaultdict

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kbe_synth as S  # noqa: E402
from kbe_synth import (SR, adsr, bandpass, decay, distort, expsweep, filter_sweep, highpass, lin, lowpass, midi_to_freq, n,  # noqa: E402
                       noise, note_to_midi, perc, pulse, reverb, saw, sine, square, supersaw, tri)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "public", "assets", "audio", "music"))

DRUM = dict(k=36, s=38, h=42, o=46, c=49, tl=45, tm=47, th=50, r=51, g=37)


# ----------------------------------------------------------------- instruments: fn(midi, dur_s, vel) -> mono
def _vibrato(d, rate=5.5, depth=0.005, start=0.12):
    return 1 + depth * sine(rate, d) * lin(d, [(0, 0), (start, 0), (start + 0.15, 1)])


def inst_lead(midi, dur, vel):
    d = dur + 0.06
    f = midi_to_freq(midi) * _vibrato(d)
    x = pulse(f, d, 0.25) * 0.75 + pulse(f, d, 0.5) * 0.25
    x = lowpass(x, 7000)
    return x * adsr(d, 0.003, 0.08, 0.78, 0.06) * vel


def inst_lead_hard(midi, dur, vel):
    """Distorted square lead for the boss theme."""
    d = dur + 0.06
    f = midi_to_freq(midi) * _vibrato(d, 6.0, 0.007)
    x = square(f, d, 0.5) + saw(f * 1.005, d) * 0.4
    x = distort(lowpass(x, 5000), 2.2)
    return x * adsr(d, 0.003, 0.06, 0.8, 0.06) * vel * 0.6


def inst_brass(midi, dur, vel):
    d = dur + 0.12
    f = midi_to_freq(midi) * _vibrato(d, 5.0, 0.006, 0.2)
    x = supersaw(f, d, 3, 0.009)
    cutoff = lin(d, [(0, 500), (0.08, 3200), (d, 1800)])
    x = filter_sweep(x, "lp", cutoff, 1.1)
    return x * adsr(d, 0.025, 0.1, 0.8, 0.1) * vel * 0.9


def inst_harm(midi, dur, vel):
    d = dur + 0.05
    f = midi_to_freq(midi)
    x = pulse(f * 0.997, d, 0.125) + pulse(f * 1.003, d, 0.125)
    x = lowpass(x, 5000) * 0.5
    return x * adsr(d, 0.004, 0.05, 0.7, 0.05) * vel


def inst_organ(midi, dur, vel):
    d = dur + 0.08
    f = midi_to_freq(midi)
    x = sine(f, d) + sine(2 * f, d) * 0.5 + sine(3 * f, d) * 0.25 + square(f, d, 0.5) * 0.15
    return lowpass(x, 4000) * adsr(d, 0.01, 0.05, 0.9, 0.08) * vel * 0.5


def inst_bass(midi, dur, vel):
    d = dur + 0.04
    f = midi_to_freq(midi)
    x = tri(f, d) * 0.7 + sine(f * 0.5, d) * 0.35 + saw(f, d) * 0.25
    x = lowpass(x, 1400)
    x = distort(x, 1.5)
    return x * adsr(d, 0.003, 0.08, 0.7, 0.04) * vel


def inst_bass_saw(midi, dur, vel):
    d = dur + 0.04
    f = midi_to_freq(midi)
    x = saw(f, d) + saw(f * 1.004, d) + sine(f * 0.5, d) * 0.5
    cutoff = lin(d, [(0, 2600), (0.12, 700), (d, 500)])
    x = filter_sweep(x, "lp", cutoff, 1.4)
    x = distort(x, 1.8) * 0.5
    return x * adsr(d, 0.003, 0.1, 0.75, 0.04) * vel


def inst_pad(midi, dur, vel):
    d = dur + 0.4
    f = midi_to_freq(midi)
    x = supersaw(f, d, 5, 0.014)
    x = lowpass(x, 1300)
    return x * adsr(d, 0.25, 0.2, 0.8, 0.35) * vel * 0.55


def inst_arp(midi, dur, vel):
    d = dur + 0.03
    f = midi_to_freq(midi)
    x = pulse(f, d, 0.2) + pulse(f * 2, d, 0.5) * 0.15
    return lowpass(x, 6000) * perc(d, 0.002, max(0.06, dur * 0.6)) * vel * 0.8


def inst_bell(midi, dur, vel):
    d = dur + 0.5
    f = midi_to_freq(midi)
    mod = sine(f * 3.5, d) * lin(d, [(0, 1.0), (d, 0.1)]) * 1.6
    x = np.sin(2 * math.pi * np.cumsum(np.full(n(d), f)) / SR + mod)
    return x * perc(d, 0.002, 0.35) * vel * 0.6


def inst_pluck(midi, dur, vel):
    d = dur + 0.05
    f = midi_to_freq(midi)
    x = square(f, d, 0.5) * 0.6 + tri(f, d) * 0.4
    cutoff = lin(d, [(0, 5000), (0.15, 900), (d, 700)])
    x = filter_sweep(x, "lp", cutoff, 1.0)
    return x * perc(d, 0.002, 0.18) * vel * 0.8


def _kick(vel):
    d = 0.32
    x = sine(expsweep(d, 165, 44), d) * perc(d, 0.001, 0.085)
    x = distort(x, 1.8)
    click = highpass(noise(0.015), 2000) * perc(0.015, 0.0003, 0.004) * 0.5
    return S.mix(x, click) * vel


def _snare(vel):
    d = 0.24
    tone = (sine(188, d) * 0.6 + sine(335, d) * 0.4) * perc(d, 0.001, 0.045)
    nz = highpass(noise(d), 1100) * perc(d, 0.001, 0.075)
    body = bandpass(noise(d), 2400, 1.0) * perc(d, 0.001, 0.03)
    return S.mix(tone * 0.7, nz * 0.9, body * 0.5) * vel


def _hat(vel, open_=False):
    d = 0.3 if open_ else 0.06
    x = highpass(noise(d), 7500) * perc(d, 0.0005, 0.11 if open_ else 0.022)
    x += bandpass(noise(d), 9000, 2.0) * perc(d, 0.0005, 0.03) * 0.5
    return x * 0.45 * vel


def _crash(vel):
    d = 1.7
    x = highpass(noise(d), 4500) * perc(d, 0.002, 0.45)
    x += bandpass(noise(d), 6500, 1.5) * perc(d, 0.002, 0.3) * 0.5
    return x * 0.45 * vel


def _ride(vel):
    d = 0.6
    x = highpass(noise(d), 6500) * perc(d, 0.001, 0.18) * 0.3
    x += sine(5100, d) * perc(d, 0.001, 0.25) * 0.08 + sine(3400, d) * perc(d, 0.001, 0.3) * 0.06
    return x * vel


def _tom(f, vel):
    d = 0.4
    x = sine(expsweep(d, f * 1.5, f), d) * perc(d, 0.001, 0.13)
    x += lowpass(noise(0.03), 2500) * perc(0.03, 0.001, 0.008) * 0.6 if False else 0
    return S.mix(x, lowpass(noise(0.03), 2500) * perc(0.03, 0.001, 0.008) * 0.5) * vel


def inst_drums(midi, dur, vel):
    if midi == 36:
        return _kick(vel)
    if midi == 38:
        return _snare(vel)
    if midi == 37:
        return _snare(vel * 0.45)
    if midi == 42:
        return _hat(vel)
    if midi == 46:
        return _hat(vel, True)
    if midi == 49:
        return _crash(vel)
    if midi == 51:
        return _ride(vel)
    if midi == 45:
        return _tom(110, vel)
    if midi == 47:
        return _tom(150, vel)
    if midi == 50:
        return _tom(200, vel)
    return np.zeros(10)


# ----------------------------------------------------------------- sequencer
class Song:
    def __init__(self, name, bpm, bars, swing=0.0, loop=True, tail=2.5):
        self.name, self.bpm, self.bars, self.swing, self.loop, self.tail = name, bpm, bars, swing, loop, tail
        self.beat = 60.0 / bpm
        self.s16 = self.beat / 4
        self.bar_s = self.beat * 4
        self.events = defaultdict(list)  # track -> [(start16, len16, midi, vel)]

    # --- pattern entry
    def pat(self, track, bar, pattern, transpose=0, vel=1.0, gate=0.9):
        pos = bar * 16.0
        for tok in pattern.split():
            v = vel
            if "*" in tok:
                tok, vs = tok.split("*")
                v = vel * float(vs)
            name, ln = tok.split(":")
            ln = float(ln)
            if name != "r":
                for p in name.split("+"):
                    self.events[track].append((pos, ln * gate, note_to_midi(p) + transpose, v))
            pos += ln
        return pos / 16.0

    def drums(self, track, bar, grid, vel=1.0):
        for key, s in grid.items():
            midi = DRUM[key]
            steps = len(s)
            step16 = 16.0 / steps
            for i, ch in enumerate(s):
                if ch == ".":
                    continue
                v = {"x": 1.0, "X": 1.3, "g": 0.4, "o": 1.0}[ch]
                m = DRUM["o"] if (ch == "o" and key == "h") else midi
                self.events[track].append((bar * 16 + i * step16, step16 * 0.9, m, vel * v))

    def hit(self, track, bar, step16, midi, len16=1, vel=1.0):
        self.events[track].append((bar * 16 + step16, len16, midi, vel))

    # --- rendering
    def render(self, tracks, master_gain=1.0, bus_comp=True):
        total_n = n(self.bar_s * self.bars)
        tail_n = n(self.tail)
        N = total_n + tail_n
        cache = {}
        stereo = np.zeros((N, 2))
        for tname, cfg in tracks.items():
            evs = self.events.get(tname, [])
            if not evs:
                continue
            inst = cfg["inst"]
            buf = np.zeros(N + n(3.0))
            for start16, len16, midi, vel in evs:
                t0 = start16 * self.s16
                if self.swing and int(round(start16 * 2)) % 4 == 2:   # odd 16ths (position .5 in 8th grid)
                    t0 += self.swing * self.s16
                dur = max(0.03, len16 * self.s16)
                key = (id(inst), midi, round(dur, 4), round(vel, 2))
                if key not in cache:
                    cache[key] = inst(midi, dur, vel)
                smp = cache[key]
                i0 = n(t0)
                i1 = min(len(buf), i0 + len(smp))
                if i1 > i0:
                    buf[i0:i1] += smp[:i1 - i0]
            buf = buf[:N]
            if cfg.get("comp"):
                buf = S.compress(buf, -12.0, 3.0, 0.003, 0.09)
            if cfg.get("lp"):
                buf = lowpass(buf, cfg["lp"])
            if cfg.get("hp"):
                buf = highpass(buf, cfg["hp"])
            if cfg.get("drive"):
                buf = distort(buf, cfg["drive"]) / cfg["drive"] ** 0.5
            if cfg.get("delay"):
                dt, fb, mx = cfg["delay"]
                d = S.delay(buf, dt, fb, mx)[:N]
                buf = buf + d - buf  # delay() returns dry+wet already sized larger; align
            if cfg.get("reverb"):
                buf = reverb(buf, 0.7, cfg["reverb"], 4500, 0.012)[:N]
            buf *= cfg.get("gain", 1.0)
            stereo += S.to_stereo(buf, cfg.get("pan", 0.0))
            print(f"  {self.name}: track {tname:8} {len(evs):4d} events, peak {S.db(S.peak(buf)):6.1f} dB  rms {S.db(S.rms(buf[:total_n])):6.1f} dB")
        # master
        if self.loop:
            stereo[:tail_n] += stereo[total_n:total_n + tail_n]
            stereo = stereo[:total_n]
        if bus_comp:
            m = stereo.mean(axis=1)
            env = np.abs(m)
            c = math.exp(-1.0 / (SR * 0.12))
            follow = S.sig.lfilter([1 - c], [1, -c], env)
            thr = 10 ** (-14 / 20)
            g = np.where(follow > thr, (thr * (follow / thr) ** (1 / 2.5)) / np.maximum(follow, 1e-9), 1.0)
            stereo *= g[:, None]
        stereo *= master_gain
        stereo = S.limiter(stereo, 0.92, 0.003, 0.08)
        if not self.loop:
            k = n(0.02)
            stereo[-k:] *= np.linspace(1, 0, k)[:, None]
        return stereo


# ----------------------------------------------------------------- harmony helpers
CHORDS = {
    "maj": [0, 4, 7], "min": [0, 3, 7], "dom": [0, 4, 7, 10], "dim": [0, 3, 6], "sus4": [0, 5, 7], "5": [0, 7, 12], "m7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11],
}


def parse_chord(sym):
    """'Em' -> (root_semitone, intervals). Supports maj (C), min (Em), dom (B7), dim (F#dim), sus4, 5."""
    i = 1
    while i < len(sym) and sym[i] in "#b":
        i += 1
    root, q = sym[:i], sym[i:]
    rm = note_to_midi(root + "0") % 12
    kind = {"": "maj", "m": "min", "7": "dom", "dim": "dim", "sus4": "sus4", "5": "5", "m7": "m7", "maj7": "maj7"}[q]
    return rm, CHORDS[kind]


def chord_notes(sym, octave):
    rm, iv = parse_chord(sym)
    base = 12 * (octave + 1) + rm
    return [base + i for i in iv]


def root_midi(sym, octave):
    rm, _ = parse_chord(sym)
    return 12 * (octave + 1) + rm


def bassline(song, track, bar0, chords, style="drive", octave=2, vel=1.0):
    """Generate a bass part per bar from chord symbols."""
    for i, sym in enumerate(chords):
        r = root_midi(sym, octave)
        nxt = root_midi(chords[(i + 1) % len(chords)], octave)
        walk = r
        if nxt != r:
            walk = nxt - 1 if nxt > r else nxt + 1
        b = bar0 + i
        if style == "drive":      # x.xxx.x.x.xxx.x. gallop, fifth on the 'and' of 2, walk on the last 16th
            steps = [(0, 2, r), (2, 1, r), (3, 1, r), (4, 2, r), (6, 2, r + 7), (8, 2, r), (10, 1, r), (11, 1, r), (12, 2, r), (14, 1, r + 12 if nxt == r else r), (15, 1, walk)]
        elif style == "pump":     # straight eighths
            steps = [(k * 2, 2, r) for k in range(6)] + [(12, 2, r + 7), (14, 1, r + 7), (15, 1, walk)]
        elif style == "half":
            steps = [(0, 6, r), (6, 2, r), (8, 6, r + 7), (14, 1, r + 7), (15, 1, walk)]
        elif style == "gallop16":  # boss: x.xx x.xx with chromatic neighbours
            steps = [(0, 2, r), (2, 1, r), (3, 1, r), (4, 2, r + 1), (6, 1, r), (7, 1, r), (8, 2, r), (10, 1, r - 2), (11, 1, r), (12, 2, r + 6), (14, 1, r + 5), (15, 1, walk)]
        elif style == "title":
            steps = [(0, 6, r), (6, 2, r + 7), (8, 4, r), (12, 2, r + 7), (14, 2, walk)]
        elif style == "tension":
            steps = [(0, 4, r), (4, 4, r), (8, 4, r), (12, 3, r), (15, 1, r + 1)]
        else:
            raise ValueError(style)
        for st, ln, m in steps:
            song.hit(track, b, st, m, ln * 0.9, vel * (1.0 if st % 4 == 0 else 0.85))


def stabs(song, track, bar0, chords, rhythm, octave=4, vel=1.0, len16=1.5):
    for i, sym in enumerate(chords):
        notes = chord_notes(sym, octave)
        for k, ch in enumerate(rhythm):
            if ch in "xX":
                for m in notes:
                    song.hit(track, bar0 + i, k * (16 / len(rhythm)), m, len16, vel * (1.2 if ch == "X" else 1.0))


def sustain(song, track, bar0, chords, octave=4, vel=1.0, bars_each=1):
    for i, sym in enumerate(chords):
        for m in chord_notes(sym, octave):
            song.hit(track, bar0 + i * bars_each, 0, m, 16 * bars_each * 0.98, vel)


def arpeggio(song, track, bar0, chords, octave=4, pattern=(0, 1, 2, 1), step=2, vel=1.0):
    for i, sym in enumerate(chords):
        notes = chord_notes(sym, octave) + [chord_notes(sym, octave + 1)[0]]
        k = 0
        pos = 0
        while pos < 16:
            song.hit(track, bar0 + i, pos, notes[pattern[k % len(pattern)] % len(notes)], step * 0.8, vel)
            pos += step
            k += 1


def beat(song, track, bar0, nbars, style, fill_every=4, crash_first=True, vel=1.0):
    for i in range(nbars):
        b = bar0 + i
        last = (i + 1) % fill_every == 0
        if style == "march":
            g = dict(k="x.....x.x.....x." if i % 2 == 0 else "x.....x.x...x...", s="....x.....g.x...", h="x.x.x.x.x.x.x.o.")
            if last:
                g = dict(k="x.....x.x.......", s="....x...xxxxXXXX", h="x.x.x.x.........")
        elif style == "march_light":
            g = dict(k="x.......x.......", s="....x.......x...", h="x.x.x.x.x.x.x.x.")
            if last:
                g = dict(k="x.......x.......", s="....x.......xxxx", h="x.x.x.x.x.x.....")
        elif style == "halftime":
            g = dict(k="x.........x.....", s="........x.......", h="x.x.x.x.x.x.x.x.")
            if last:
                g = dict(k="x.........x.....", s="........x...xxXX", h="x.x.x.x.x.x.....")
        elif style == "double":
            g = dict(k="x.x.x.x.x.x.x.x.", s="....x.......x...", h="xxxxxxxxxxxxxxxx")
            if last:
                g = dict(k="x.x.x.x.x.x.....", s="....x...x.xxXXXX", h="xxxxxxxx........")
        elif style == "thrash":
            g = dict(k="x.xxx.x.x.xxx.x.", s="....X.......X...", h="x.x.x.x.x.x.x.x.")
            if last:
                g = dict(k="x.xxx.x.x.......", s="....X...XXXXxxXX", h="x.x.x.x.........", tl="............x...", th="..............x.")
        elif style == "title":
            g = dict(k="x.......x.......", s="....x.......x...", h="x.x.x.x.x.x.x.x.", r="x...x...x...x...")
            if last:
                g = dict(k="x.......x.......", s="....x.......x.xx", h="x.x.x.x.x.x.x.x.", r="x...x...x...x...")
        elif style == "tension":
            g = dict(k="x.......x.......", s="", h="x.x.x.x.x.x.x.x.")
        elif style == "intro_roll":
            g = dict(s="gggggggggggggggg" if not last else "xxxxxxxxXXXXXXXX", k="x.......x......." if last else "x...............")
        elif style == "none":
            g = {}
        else:
            raise ValueError(style)
        if crash_first and i == 0:
            song.hit(track, b, 0, DRUM["c"], 4, 1.0)
        song.drums(track, b, {k: v for k, v in g.items() if v}, vel)


# ----------------------------------------------------------------- songs
def song_stage1():
    """'Pine Ridge Breakout' - E minor, 170 BPM, 64 bars (~90 s), seamless loop."""
    s = Song("music_stage1", 170, 64, swing=0.0)
    A = ["Em", "Em", "C", "D", "Em", "D", "C", "B7"]
    B = ["Am", "C", "G", "D", "Am", "C", "D", "Em"]
    C = ["C", "D", "Em", "Em", "C", "D", "B7", "B7"]
    T = ["Em", "C", "D", "B7"]
    INTRO = ["Em", "Em", "Em", "B7"]
    sections = [(0, INTRO, "intro"), (4, A, "A1"), (12, A, "A2"), (20, B, "B1"), (28, C, "C"), (36, A, "D"), (44, A, "A3"), (52, B, "B2"), (60, T, "T")]

    lead = {
        "A": ["e5:2 g5:2 a5:2 b5:4 r:2 b5:2 a5:2", "g5:2 e5:2 d5:2 e5:6 r:4", "e5:2 g5:2 a5:2 c6:4 r:2 c6:2 b5:2", "a5:2 g5:2 f#5:2 g5:2 a5:4 r:4",
              "e5:2 g5:2 a5:2 b5:4 r:2 d6:2 b5:2", "a5:2 g5:2 f#5:2 a5:6 r:4", "g5:2 a5:2 b5:2 c6:4 r:2 e6:2 d6:2", "b5:2 a5:2 f#5:2 d#5:6 r:4"],
        "B": ["a5:2 b5:2 c6:2 b5:2 a5:2 g5:2 a5:4", "g5:2 e5:2 g5:4 r:2 e5:2 g5:2 c6:2", "b5:4 d6:2 b5:2 a5:2 g5:2 a5:4", "f#5:2 g5:2 f#5:2 d5:2 a4:8",
              "a5:2 b5:2 c6:2 b5:2 a5:2 g5:2 a5:4", "c6:2 b5:2 a5:2 g5:2 e5:4 g5:4", "a5:2 b5:2 d6:4 e6:4 d6:2 b5:2", "a5:2 b5:2 e6:12"],
        "C": ["e5:4 d5:2 e5:2 g5:8", "a5:4 g5:2 a5:2 b5:8", "e5:4 d5:2 e5:2 b4:8", "d5:2 e5:2 d5:2 b4:2 g4:8",
              "e5:4 d5:2 e5:2 g5:8", "a5:4 g5:2 a5:2 d6:8", "b5:4 a5:2 b5:2 d#6:8", "f#6:2 e6:2 d#6:2 b5:2 f#5:8"],
        "D": ["e5:1 f#5:1 g5:1 a5:1 b5:2 a5:2 g5:2 a5:2 b5:4", "e6:2 d6:2 b5:2 a5:2 g5:1 a5:1 g5:1 e5:1 d5:4", "c6:2 b5:2 c6:2 e6:2 g6:4 e6:2 c6:2",
              "a5:1 b5:1 a5:1 g5:1 f#5:2 a5:2 d6:4 a5:2 f#5:2", "e5:1 f#5:1 g5:1 a5:1 b5:2 a5:2 g5:2 a5:2 b5:4", "d6:2 c#6:2 d6:2 e6:2 f#6:4 d6:2 a5:2",
              "g6:2 e6:2 c6:2 e6:2 g6:2 a6:2 b6:4", "a6:2 f#6:2 d#6:2 b5:2 f#5:4 r:4"],
        "T": ["e6:4 d6:2 b5:2 g5:8", "a5:2 g5:2 a5:2 c6:2 a5:8", "f#6:4 d6:4 a5:4 f#5:4", "b5:2 a#5:2 b5:2 d#6:2 f#6:8"],
        "intro": ["r:16", "r:16", "e5:2 g5:2 b5:2 e6:10", "d#6:4 b5:4 f#5:4 r:4"],
    }
    for bar0, chords, tag in sections:
        kind = tag[0] if tag[0] in "ABCDT" else tag
        # bass
        if tag == "intro":
            for i in range(4):
                s.hit("bass", i, 0, root_midi("E" if i < 3 else "B", 2), 15, 1.0)
            beat(s, "drums", 0, 4, "intro_roll", 4, False)
            s.pat("brass", 2, "e4+g4+b4:2 r:2 e4+g4+b4:2 r:10")
            s.pat("brass", 3, "d#4+f#4+b4:4 r:12")
        elif kind == "C":
            bassline(s, "bass", bar0, chords, "half")
            beat(s, "drums", bar0, 8, "halftime", 4)
            sustain(s, "pad", bar0, chords, 3, 0.8)
            stabs(s, "harm", bar0, chords, "x.......x.x.....", 4, 0.7, 3)
        elif kind == "T":
            bassline(s, "bass", bar0, chords, "pump")
            beat(s, "drums", bar0, 4, "march", 4)
            stabs(s, "harm", bar0, chords, "x...x...x...x...", 4, 0.8)
        else:
            bassline(s, "bass", bar0, chords, "drive")
            beat(s, "drums", bar0, 8, "march" if tag not in ("A1",) else "march_light", 4)
            if tag in ("A2", "A3", "B1", "B2", "D"):
                stabs(s, "harm", bar0, chords, "..x...x...x...x." if kind in "AD" else "x.x.x.x.x.x.x.x.", 4, 0.7 if kind == "B" else 0.8)
            if tag in ("A3", "B2"):
                sustain(s, "pad", bar0, chords, 3, 0.5)
        if kind in lead:
            pos = bar0
            for bar_pat in lead[kind]:
                nxt = s.pat("lead", pos, bar_pat, 0, 1.0 if kind != "D" else 0.95)
                pos = nxt
            # harmony voice a third/sixth below on the repeats
            if tag in ("A3", "B2"):
                pos = bar0
                for bar_pat in lead[kind]:
                    pos = s.pat("lead2", pos, bar_pat, -12, 0.55)
    tracks = {
        "drums": dict(inst=inst_drums, gain=0.85, pan=0.0, reverb=0.08, comp=True),
        "bass": dict(inst=inst_bass, gain=0.72, pan=0.0),
        "harm": dict(inst=inst_harm, gain=0.45, pan=0.35, reverb=0.12, comp=True),
        "pad": dict(inst=inst_pad, gain=1.0, pan=-0.3, reverb=0.2),
        "brass": dict(inst=inst_brass, gain=0.6, pan=-0.1, reverb=0.15),
        "lead": dict(inst=inst_lead, gain=0.62, pan=-0.12, reverb=0.14, delay=(60 / 170 * 0.75, 0.25, 0.18)),
        "lead2": dict(inst=inst_lead, gain=0.4, pan=0.3, reverb=0.14),
    }
    return s, tracks


def song_boss():
    """'MOOSEZILLA' - D phrygian, 184 BPM, 48 bars (~63 s), loop."""
    s = Song("music_boss", 184, 48)
    R = ["Dm", "Dm", "Dm", "Dm", "Dm", "Dm", "Dm", "Dm"]
    Bc = ["Dm", "Dm", "Fm", "Fm", "Gm", "Gm", "G#dim", "A7"]
    Cc = ["Dm", "Dm", "G#dim", "G#dim", "Dm", "Dm", "Bb", "A7"]
    lead = {
        "A": ["d5:2 f5:2 g5:2 g#5:4 g5:2 f5:2 d5:2", "c5:2 d5:2 f5:2 d5:6 r:4", "d5:2 f5:2 g5:2 a5:4 bb5:2 a5:2 g5:2", "f5:2 g5:2 f5:2 eb5:2 d5:4 r:4",
              "a5:2 bb5:2 a5:2 g5:2 f5:4 d5:2 f5:2", "g5:2 g#5:2 g5:2 f5:2 eb5:4 c5:4", "d5:2 f5:2 g#5:2 a5:2 c6:2 bb5:2 a5:2 g5:2", "f5:2 eb5:2 d5:2 c#5:2 d5:8"],
        "B": ["d6:4 r:2 d6:2 c6:2 bb5:2 a5:4", "f5:2 g5:2 a5:8 r:4", "f6:4 r:2 f6:2 eb6:2 d6:2 c6:4", "g#5:2 bb5:2 c6:8 r:4",
              "g6:4 f6:2 eb6:2 d6:4 c6:2 bb5:2", "g#5:4 bb5:4 c6:4 d6:4", "eb6:2 d6:2 eb6:2 f6:2 g6:4 g#6:4", "a6:2 g6:2 f6:2 e6:2 d6:8"],
        "C": ["d5:8 r:8", "g#5:8 g5:8", "f5:4 eb5:4 d5:8", "r:16", "d5:4 f5:4 g#5:8", "a5:4 g5:4 f5:8", "bb5:2 a5:2 bb5:2 c6:2 d6:8", "c#6:4 e6:4 g6:4 a6:4"],
        "intro": ["r:16", "r:16", "r:16", "d5:1 d#5:1 e5:1 f5:1 f#5:1 g5:1 g#5:1 a5:1 bb5:1 b5:1 c6:1 c#6:1 d6:4"],
    }
    sections = [(0, R[:4], "intro"), (4, R, "A1"), (12, R, "A2"), (20, Bc, "B1"), (28, R, "A3"), (36, Cc, "C"), (44, ["Dm", "Dm", "G#dim", "A7"], "T")]
    for bar0, chords, tag in sections:
        kind = tag[0] if tag[0] in "ABCT" else tag
        if tag == "intro":
            bassline(s, "bass", 0, chords, "gallop16", 2, 1.0)
            beat(s, "drums", 0, 4, "none", 4, True)
            s.drums("drums", 2, dict(tl="x...x...x.x.....", th="........x...x.x."))
            s.drums("drums", 3, dict(s="xxxxxxxxXXXXXXXX", k="x...x...x...x..."))
        elif kind == "C":
            bassline(s, "bass", bar0, chords, "half", 2)
            beat(s, "drums", bar0, 8, "halftime", 4)
            sustain(s, "pad", bar0, chords, 3, 0.9)
            s.pat("harm", bar0 + 3, "d4+g#4:4 r:4 d4+g#4:4 r:4", 0, 0.9)
        elif kind == "T":
            bassline(s, "bass", bar0, chords, "gallop16", 2)
            beat(s, "drums", bar0, 4, "thrash", 4)
            s.pat("lead", bar0, "d6:2 r:2 d6:2 r:2 c6:2 r:2 bb5:2 a5:2 g#5:4 r:4 g#5:2 r:2 g5:2 r:2 g#5:4 a5:4 a5:1 bb5:1 b5:1 c6:1 c#6:1 d6:1 d#6:1 e6:1 f6:4 r:4")
            stabs(s, "harm", bar0, chords, "x.x.x.x.x.x.x.x.", 4, 0.8)
        else:
            bassline(s, "bass", bar0, chords, "gallop16", 2)
            beat(s, "drums", bar0, 8, "thrash" if tag != "A1" else "double", 4)
            if tag in ("A2", "A3", "B1"):
                stabs(s, "harm", bar0, chords, "x.xxx.x.x.xxx.x." if kind == "A" else "x...x...x...x...", 4, 0.75, 1.2 if kind == "A" else 3)
        if kind in lead:
            pos = bar0
            for bar_pat in lead[kind]:
                pos = s.pat("lead", pos, bar_pat, 0, 1.0)
            if tag in ("A3", "B1"):
                pos = bar0
                for bar_pat in lead[kind]:
                    pos = s.pat("lead2", pos, bar_pat, -5 if kind == "A" else -12, 0.5)
    tracks = {
        "drums": dict(inst=inst_drums, gain=0.9, reverb=0.06, comp=True),
        "bass": dict(inst=inst_bass_saw, gain=0.75),
        "harm": dict(inst=inst_harm, gain=0.42, pan=0.4, reverb=0.1, comp=True),
        "pad": dict(inst=inst_pad, gain=1.0, pan=-0.3, reverb=0.25),
        "lead": dict(inst=inst_lead_hard, gain=0.7, pan=-0.1, reverb=0.12, delay=(60 / 184 * 0.75, 0.3, 0.2)),
        "lead2": dict(inst=inst_lead_hard, gain=0.4, pan=0.35, reverb=0.12),
    }
    return s, tracks


def song_title():
    """'Breakout Anthem' - G mixolydian, 132 BPM, 32 bars (~58 s), loop."""
    s = Song("music_title", 132, 32, swing=0.0)
    A = ["G", "G", "C", "D", "Em", "C", "G", "D"]
    B = ["Em", "C", "G", "D", "Em", "C", "D", "D"]
    INTRO = ["G", "G", "C", "D"]
    T = ["Em", "C", "D", "D"]
    lead = {
        "A": ["d5:4 g5:4 b5:4 d6:4", "c6:2 b5:2 a5:2 b5:2 g5:8", "e5:4 g5:4 c6:4 e6:4", "d6:2 c6:2 a5:2 c6:2 a5:8",
              "e5:4 g5:2 a5:2 b5:8", "c6:4 b5:2 a5:2 g5:8", "d6:4 b5:2 g5:2 a5:4 b5:4", "a5:2 g5:2 f#5:2 g5:2 a5:8"],
        "B": ["e6:4 d6:2 b5:2 g5:8", "a5:2 b5:2 c6:4 e6:8", "d6:4 b5:2 g5:2 d5:8", "e5:2 f#5:2 g5:2 a5:2 f#5:8",
              "e6:4 d6:2 b5:2 g5:4 a5:4", "b5:4 c6:4 e6:4 g6:4", "f#6:4 d6:2 a5:2 d6:8", "c6:2 b5:2 a5:2 b5:2 d5:8"],
        "T": ["g5:4 a5:4 b5:8", "c6:4 e6:4 g6:8", "f#6:4 a6:4 d6:8", "c6:2 b5:2 a5:2 b5:2 a5:4 r:4"],
    }
    sections = [(0, INTRO, "intro"), (4, A, "A1"), (12, B, "B1"), (20, A, "A2"), (28, T, "T")]
    for bar0, chords, tag in sections:
        kind = tag[0] if tag[0] in "ABT" else tag
        sustain(s, "pad", bar0, chords, 3, 0.9)
        arpeggio(s, "arp", bar0, chords, 4, (0, 1, 2, 3, 2, 1), 2, 0.9)
        if tag == "intro":
            beat(s, "drums", 0, 4, "none", 4, False)
            s.drums("drums", 3, dict(s="........x.x.xxxx", k="x.......x......."))
            s.pat("bell", 0, "g5:4 d6:4 b5:4 g6:4 e6:4 c6:4 g5:4 e6:4 e5:4 g5:4 c6:4 e6:4 d6:4 a5:4 f#5:4 d5:4", 0, 0.8)
        else:
            bassline(s, "bass", bar0, chords, "title", 2)
            beat(s, "drums", bar0, len(chords), "title", 4, True)
        if kind in lead:
            pos = bar0
            for bar_pat in lead[kind]:
                pos = s.pat("brass", pos, bar_pat, 0, 1.0, 0.92)
            if tag in ("A2", "B1"):
                pos = bar0
                for bar_pat in lead[kind]:
                    pos = s.pat("brass2", pos, bar_pat, -12 if tag == "A2" else -5, 0.5, 0.92)
    tracks = {
        "drums": dict(inst=inst_drums, gain=0.7, reverb=0.12, comp=True),
        "bass": dict(inst=inst_bass, gain=0.6),
        "pad": dict(inst=inst_pad, gain=0.9, pan=0.0, reverb=0.3),
        "arp": dict(inst=inst_arp, gain=0.35, pan=0.45, reverb=0.2, delay=(60 / 132 * 0.75, 0.3, 0.25)),
        "bell": dict(inst=inst_bell, gain=0.5, pan=-0.3, reverb=0.35),
        "brass": dict(inst=inst_brass, gain=0.85, pan=-0.1, reverb=0.2),
        "brass2": dict(inst=inst_brass, gain=0.5, pan=0.3, reverb=0.2),
    }
    return s, tracks


def song_complete():
    """Mission complete fanfare (E major), ~5 s, one-shot."""
    s = Song("jingle_complete", 150, 3, loop=False, tail=2.2)
    s.pat("brass", 0, "e5:2 e5:2 e5:2 g#5:6 r:4 b5:2 b5:2 b5:2 e6:10 e6:2 d#6:2 e6:2 g#6:10")
    s.pat("brass2", 0, "b4:2 b4:2 b4:2 e5:6 r:4 g#5:2 g#5:2 g#5:2 b5:10 b5:2 b5:2 b5:2 e6:10")
    s.pat("bass", 0, "e2:4 e2:4 e2:4 e2:4 e2:4 b2:4 e2:4 e2:4 e2:16")
    s.pat("pad", 0, "e3+g#3+b3:16 e3+g#3+b3:16 e3+g#3+b3+e4:16", 0, 0.8)
    s.drums("drums", 0, dict(k="x...x...x...x...", s="....x.......x...", h="x.x.x.x.x.x.x.x."))
    s.drums("drums", 1, dict(k="x...x...x...x...", s="....x...xxxxXXXX", h="x.x.x.x.x.x.x.x."))
    s.drums("drums", 2, dict(k="x...............", c="x..............."))
    s.pat("bell", 2, "e6:2 g#6:2 b6:2 e7:10", 0, 0.7)
    tracks = {
        "drums": dict(inst=inst_drums, gain=0.8, reverb=0.15, comp=True), "bass": dict(inst=inst_bass, gain=0.8),
        "pad": dict(inst=inst_pad, gain=0.9, reverb=0.3), "brass": dict(inst=inst_brass, gain=0.65, pan=-0.1, reverb=0.25),
        "brass2": dict(inst=inst_brass, gain=0.45, pan=0.3, reverb=0.25), "bell": dict(inst=inst_bell, gain=0.5, pan=0.2, reverb=0.4),
    }
    return s, tracks


def song_gameover():
    """Game over: chromatic descent to E minor, ~4 s, one-shot."""
    s = Song("jingle_gameover", 120, 2, loop=False, tail=2.0)
    s.pat("lead", 0, "e5:3 r:1 d5:3 r:1 c5:3 r:1 b4:4 a4:4 g#4:4 e4:8", 0, 0.9)
    s.pat("pad", 0, "e3+g3+b3:16 a2+c3+e3:8 b2+d#3+f#3:8", 0, 0.9)
    s.pat("bass", 0, "e2:8 e2:8 a1:8 b1:8")
    s.drums("drums", 1, dict(k="........x.......", tl="............x...", c="........x......."))
    tracks = {
        "drums": dict(inst=inst_drums, gain=0.7, reverb=0.3, comp=True), "bass": dict(inst=inst_bass, gain=0.7),
        "pad": dict(inst=inst_pad, gain=1.0, reverb=0.4), "lead": dict(inst=inst_organ, gain=0.6, pan=0.0, reverb=0.35),
    }
    return s, tracks


def song_continue():
    """Continue countdown: tense 4-bar loop at 120 BPM (8 s)."""
    s = Song("music_continue", 120, 4)
    bassline(s, "bass", 0, ["Am", "Am", "Bb", "Bb"], "tension", 2)
    beat(s, "drums", 0, 4, "tension", 4, False)
    s.pat("pad", 0, "a3+c4+e4:16 a3+c4+e4:16 bb3+d4+f4:16 bb3+d4+e4:16", 0, 0.8)
    s.pat("arp", 0, "a4:1 r:3 a4:1 r:3 a4:1 r:3 a4:1 r:1 c5:1 e5:1 " * 2 + "bb4:1 r:3 bb4:1 r:3 bb4:1 r:3 bb4:1 r:1 d5:1 f5:1 " * 2, 0, 0.8)
    s.pat("lead", 2, "r:8 e5:2 f5:2 e5:2 d#5:2 e5:16", 0, 0.7)
    tracks = {
        "drums": dict(inst=inst_drums, gain=0.8, reverb=0.2, comp=True), "bass": dict(inst=inst_bass_saw, gain=0.8),
        "pad": dict(inst=inst_pad, gain=1.0, reverb=0.3), "arp": dict(inst=inst_pluck, gain=0.45, pan=0.3, reverb=0.25),
        "lead": dict(inst=inst_organ, gain=0.4, pan=-0.2, reverb=0.3),
    }
    return s, tracks


SONGS = {
    "music_title": (song_title, -16.0),
    "music_stage1": (song_stage1, -14.0),
    "music_boss": (song_boss, -13.0),
    "jingle_complete": (song_complete, -14.0),
    "jingle_gameover": (song_gameover, -16.0),
    "music_continue": (song_continue, -16.0),
}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    wav = "--wav" in sys.argv
    keys = args or list(SONGS.keys())
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for k in keys:
        fn, loud = SONGS[k]
        S.seed(99)
        song, tracks = fn()
        print(f"rendering {k}: {song.bars} bars @ {song.bpm} BPM = {song.bars * song.bar_s:.1f} s")
        x = song.render(tracks)
        mono = x.mean(axis=1)
        x = x * (10 ** (loud / 20) / max(S.rms(mono), 1e-9))
        x = S.limiter(x, 0.80, 0.003, 0.1)
        path = os.path.join(OUT, k + ".ogg")
        S.write_ogg(path, x.astype(np.float32), quality=0.45)
        if wav:
            S.write_wav(os.path.join("/tmp/kbe-ui/audio/wav", k + ".wav"), x)
        manifest[k] = dict(file=f"assets/audio/music/{k}.ogg", duration=round(len(x) / SR, 3), loop=song.loop, bpm=song.bpm, bars=song.bars,
                           peak_db=round(S.db(S.peak(x)), 1), rms_db=round(S.db(S.rms(x.mean(axis=1))), 1))
        print(f"  -> {k}: {len(x)/SR:.2f}s peak {S.db(S.peak(x)):.1f} dB rms {S.db(S.rms(x.mean(axis=1))):.1f} dB {'LOOP' if song.loop else 'one-shot'}")
    if not args:
        S.save_manifest(os.path.join(OUT, "music_manifest.json"), manifest)


if __name__ == "__main__":
    main()
