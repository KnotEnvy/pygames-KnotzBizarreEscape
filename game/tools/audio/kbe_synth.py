"""KBE audio DSP toolkit (numpy + scipy). Shared by sfx.py (sound effects) and music.py (songs).

Everything is float32/float64 mono arrays at SR unless noted. Durations are seconds.
Run via:  uv run --with numpy,scipy,soundfile,pillow python3 -I <script>
"""
from __future__ import annotations

import json
import math
import os

import numpy as np
import scipy.signal as sig
import soundfile as sf

SR = 44100
TWO_PI = 2.0 * math.pi


# ----------------------------------------------------------------- basics
def n(dur: float) -> int:
    return max(1, int(round(dur * SR)))


def t(dur: float) -> np.ndarray:
    return np.arange(n(dur)) / SR


def silence(dur: float) -> np.ndarray:
    return np.zeros(n(dur))


def _phase(freq, dur: float, phase0: float = 0.0) -> np.ndarray:
    N = n(dur)
    if np.isscalar(freq):
        ph = np.arange(N) * (float(freq) / SR)
    else:
        f = np.asarray(freq, dtype=float)
        if len(f) != N:
            f = np.interp(np.linspace(0, 1, N), np.linspace(0, 1, len(f)), f)
        ph = np.cumsum(f) / SR
    return ph + phase0


# ----------------------------------------------------------------- oscillators
def sine(freq, dur, phase0=0.0):
    return np.sin(TWO_PI * _phase(freq, dur, phase0))


def square(freq, dur, duty=0.5):
    """Pulse wave, DC-free for any duty cycle."""
    ph = _phase(freq, dur) % 1.0
    return np.where(ph < duty, 1.0, -1.0) - (2.0 * duty - 1.0)


pulse = square


def saw(freq, dur):
    ph = _phase(freq, dur) % 1.0
    return 2.0 * ph - 1.0


def tri(freq, dur):
    ph = _phase(freq, dur) % 1.0
    return 4.0 * np.abs(ph - 0.5) - 1.0


def supersaw(freq, dur, voices=5, detune=0.012, spread=1.0):
    out = np.zeros(n(dur))
    for i in range(voices):
        d = (i - (voices - 1) / 2) / max(1, (voices - 1) / 2) * detune * spread
        f = freq * (1 + d) if np.isscalar(freq) else np.asarray(freq) * (1 + d)
        out += saw(f, dur) * (1.0 / voices)
    return out


_rng = np.random.default_rng(1234)


def seed(s: int):
    global _rng
    _rng = np.random.default_rng(s)


def noise(dur, color="white"):
    N = n(dur)
    w = _rng.standard_normal(N)
    if color == "white":
        return w
    if color == "pink":
        # Paul Kellet's economy pink filter
        b = np.zeros(7)
        out = np.empty(N)
        for i in range(N):
            x = w[i]
            b[0] = 0.99886 * b[0] + x * 0.0555179
            b[1] = 0.99332 * b[1] + x * 0.0750759
            b[2] = 0.96900 * b[2] + x * 0.1538520
            b[3] = 0.86650 * b[3] + x * 0.3104856
            b[4] = 0.55000 * b[4] + x * 0.5329522
            b[5] = -0.7616 * b[5] - x * 0.0168980
            out[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + x * 0.5362) * 0.11
            b[6] = x * 0.115926
        return out
    if color == "brown":
        out = np.cumsum(w) / math.sqrt(N)
        out -= np.linspace(out[0], out[-1], N)
        return out / (np.abs(out).max() + 1e-9)
    raise ValueError(color)


def expsweep(dur, f0, f1):
    """Per-sample frequency array sweeping exponentially from f0 to f1."""
    N = n(dur)
    return f0 * (f1 / f0) ** (np.arange(N) / max(1, N - 1))


def linsweep(dur, f0, f1):
    return np.linspace(f0, f1, n(dur))


# ----------------------------------------------------------------- envelopes
def adsr(dur, a=0.005, d=0.05, s=0.7, r=0.05, curve=1.0):
    N = n(dur)
    a_n, d_n, r_n = n(a), n(d), n(r)
    r_n = min(r_n, N)
    env = np.ones(N) * s
    a_n = min(a_n, N)
    env[:a_n] = np.linspace(0, 1, a_n) ** curve
    d_end = min(N, a_n + d_n)
    if d_end > a_n:
        env[a_n:d_end] = np.linspace(1, s, d_end - a_n)
    if r_n > 0:
        env[N - r_n:] *= np.linspace(1, 0, r_n) ** curve
    return env


def decay(dur, tau):
    """Exponential decay with time constant tau (seconds)."""
    return np.exp(-t(dur) / tau)


def perc(dur, attack=0.002, tau=0.1):
    """Percussive: fast linear attack then exponential decay, forced to zero at the end."""
    e = decay(dur, tau)
    a_n = min(n(attack), n(dur))
    e[:a_n] *= np.linspace(0, 1, a_n)
    return e * fade(dur, 0, min(0.005, dur / 4))


def lin(dur, points):
    """Piecewise linear envelope. points = [(time, value), ...]; held after the last point."""
    tt = t(dur)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return np.interp(tt, xs, ys)


def fade(dur, fin=0.005, fout=0.01):
    N = n(dur)
    env = np.ones(N)
    fi, fo = min(n(fin), N), min(n(fout), N)
    if fi > 0:
        env[:fi] *= np.linspace(0, 1, fi)
    if fo > 0:
        env[N - fo:] *= np.linspace(1, 0, fo)
    return env


def declick(x, ms=3.0):
    x = np.array(x, dtype=float)
    k = min(len(x) // 2, int(SR * ms / 1000))
    if k > 0:
        x[:k] *= np.linspace(0, 1, k)
        x[-k:] *= np.linspace(1, 0, k)
    return x


# ----------------------------------------------------------------- filters (RBJ biquads)
def biquad_coeffs(kind, f0, q=0.707, gain_db=0.0):
    f0 = float(np.clip(f0, 10.0, SR * 0.49))
    w0 = TWO_PI * f0 / SR
    cw, sw = math.cos(w0), math.sin(w0)
    alpha = sw / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bp":
        b = [alpha, 0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "notch":
        b = [1, -2 * cw, 1]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peak":
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == "lowshelf":
        sq = 2 * math.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sq), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sq)]
        a = [(A + 1) + (A - 1) * cw + sq, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sq]
    elif kind == "highshelf":
        sq = 2 * math.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
        a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return b, a


def biquad(x, kind, f0, q=0.707, gain_db=0.0):
    b, a = biquad_coeffs(kind, f0, q, gain_db)
    return sig.lfilter(b, a, x)


def lowpass(x, f0, q=0.707, passes=1):
    for _ in range(passes):
        x = biquad(x, "lp", f0, q)
    return x


def highpass(x, f0, q=0.707, passes=1):
    for _ in range(passes):
        x = biquad(x, "hp", f0, q)
    return x


def bandpass(x, f0, q=1.0):
    return biquad(x, "bp", f0, q)


def peak_eq(x, f0, gain_db, q=1.0):
    return biquad(x, "peak", f0, q, gain_db)


def filter_sweep(x, kind, freqs, q=0.707, block=64):
    """Time-varying biquad. freqs: array (any length, interpolated) of cutoff per sample."""
    x = np.asarray(x, dtype=float)
    N = len(x)
    f = np.asarray(freqs, dtype=float)
    if len(f) != N:
        f = np.interp(np.linspace(0, 1, N), np.linspace(0, 1, len(f)), f)
    out = np.empty(N)
    zi = np.zeros(2)
    for s in range(0, N, block):
        e = min(N, s + block)
        b, a = biquad_coeffs(kind, f[(s + e) // 2], q)
        out[s:e], zi = sig.lfilter(b, a, x[s:e], zi=zi)
    return out


# ----------------------------------------------------------------- effects
def distort(x, drive=2.0, kind="tanh"):
    x = np.asarray(x, dtype=float) * drive
    if kind == "tanh":
        return np.tanh(x)
    if kind == "hard":
        return np.clip(x, -1, 1)
    if kind == "fold":
        return np.sin(x * 1.5)
    if kind == "soft":
        return x - x ** 3 / 3 if np.all(np.abs(x) <= 1) else np.clip(x - np.clip(x, -1, 1) ** 3 / 3, -2 / 3, 2 / 3) * 1.5
    raise ValueError(kind)


def bitcrush(x, bits=8, rate_div=1):
    x = np.asarray(x, dtype=float)
    if rate_div > 1:
        idx = (np.arange(len(x)) // rate_div) * rate_div
        x = x[idx]
    q = 2 ** (bits - 1)
    return np.round(x * q) / q


def delay(x, time=0.25, feedback=0.4, mix=0.3, lowpass_hz=4000.0):
    x = np.asarray(x, dtype=float)
    d = n(time)
    out = np.zeros(len(x) + d * 6)
    out[:len(x)] = x
    buf = np.zeros_like(out)
    buf[:len(x)] = x
    # iterative feedback taps (6 repeats is plenty for game audio)
    tap = x.copy()
    for k in range(1, 7):
        tap = lowpass(tap, lowpass_hz) * feedback
        s = d * k
        e = min(len(out), s + len(tap))
        out[s:e] += tap[:e - s] * (mix / feedback) if feedback > 0 else 0
    return out


def reverb(x, size=0.6, mix=0.25, damp=3500.0, predelay=0.01):
    """Schroeder reverb: 4 parallel combs + 2 series allpasses. Returns a longer array."""
    x = np.asarray(x, dtype=float)
    tail = n(0.4 + 2.0 * size)
    N = len(x) + tail
    dry = np.zeros(N)
    dry[:len(x)] = x
    inp = np.zeros(N)
    pd = n(predelay)
    inp[pd:pd + len(x)] = x[:N - pd]
    combs = [int(SR * s * size) for s in (0.0297, 0.0371, 0.0411, 0.0437)]
    gains = [0.805, 0.827, 0.783, 0.764]
    wet = np.zeros(N)
    for L, g in zip(combs, gains):
        L = max(L, 8)
        # comb with lowpass in feedback: y[n] = x[n] + g * lp(y[n-L])
        b = np.zeros(L + 1)
        b[0] = 1.0
        a = np.zeros(L + 1)
        a[0] = 1.0
        a[L] = -g
        y = sig.lfilter(b, a, inp)
        wet += lowpass(y, damp)
    wet *= 0.25
    for L, g in ((int(SR * 0.005), 0.7), (int(SR * 0.0017), 0.7)):
        b = np.zeros(L + 1)
        a = np.zeros(L + 1)
        b[0] = -g
        b[L] = 1.0
        a[0] = 1.0
        a[L] = -g
        wet = sig.lfilter(b, a, wet)
    return dry * (1 - mix) + wet * mix


def compress(x, threshold_db=-12.0, ratio=4.0, attack=0.005, release=0.08, makeup_db=0.0):
    x = np.asarray(x, dtype=float)
    thr = 10 ** (threshold_db / 20)
    env = np.abs(x)
    a_c = math.exp(-1.0 / (SR * attack))
    r_c = math.exp(-1.0 / (SR * release))
    # envelope follower (vectorised approximation via lfilter on rectified signal)
    follow = sig.lfilter([1 - r_c], [1, -r_c], env)
    fast = sig.lfilter([1 - a_c], [1, -a_c], env)
    env = np.maximum(follow, fast)
    gain = np.ones_like(env)
    over = env > thr
    gain[over] = (thr * (env[over] / thr) ** (1.0 / ratio)) / env[over]
    return x * gain * 10 ** (makeup_db / 20)


def limiter(x, ceiling=0.98, lookahead=0.002, release=0.06):
    """Lookahead peak limiter (release-smoothed gain, computed on a decimated envelope)."""
    x = np.asarray(x, dtype=float)
    if x.ndim == 2:
        g = _limiter_gain(np.max(np.abs(x), axis=1), ceiling, lookahead, release)
        return np.clip(x * g[:, None], -ceiling, ceiling)
    g = _limiter_gain(np.abs(x), ceiling, lookahead, release)
    return np.clip(x * g, -ceiling, ceiling)


def _limiter_gain(absx, ceiling, lookahead, release):
    N = len(absx)
    la = max(1, n(lookahead))
    hop = 16
    # windowed max over the lookahead, decimated by hop
    M = int(math.ceil(N / hop))
    pad = np.concatenate([absx, np.zeros(M * hop + la - N)])
    win = np.lib.stride_tricks.sliding_window_view(pad, la)[::hop][:M].max(axis=1)
    target = np.minimum(1.0, ceiling / np.maximum(win, 1e-9))
    r_c = math.exp(-hop / (SR * release))
    g = np.empty(M)
    cur = 1.0
    for i in range(M):
        tg = target[i]
        cur = tg if tg < cur else tg + (cur - tg) * r_c
        g[i] = cur
    full = np.interp(np.arange(N), np.arange(M) * hop, g)
    # make sure the gain is applied *before* the peak: shift left by the lookahead
    full = np.concatenate([full[la:], np.full(la, full[-1])]) if la < N else full
    return np.minimum(full, 1.0)


def softclip(x, ceiling=0.98):
    return np.tanh(np.asarray(x, dtype=float) / ceiling) * ceiling


# ----------------------------------------------------------------- mixing / measurement
def mix(*parts, gains=None):
    N = max(len(p) for p in parts)
    out = np.zeros(N)
    for i, p in enumerate(parts):
        g = 1.0 if gains is None else gains[i]
        out[:len(p)] += np.asarray(p, dtype=float) * g
    return out


def place(events, total=None):
    """events: list of (offset_seconds, signal, gain). Returns mixed mono."""
    end = 0
    for off, s, *g in events:
        end = max(end, n(off) + len(s))
    if total is not None:
        end = max(end, n(total))
    out = np.zeros(end)
    for off, s, *g in events:
        gain = g[0] if g else 1.0
        i = n(off)
        out[i:i + len(s)] += np.asarray(s, dtype=float) * gain
    return out


def gain_db(x, db):
    return np.asarray(x, dtype=float) * 10 ** (db / 20)


def peak(x):
    return float(np.max(np.abs(x))) if len(x) else 0.0


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0


def db(v):
    return 20 * math.log10(max(v, 1e-9))


def normalize(x, peak_level=0.95):
    p = peak(x)
    return np.asarray(x, dtype=float) * (peak_level / p) if p > 0 else np.asarray(x, dtype=float)


def set_loudness(x, target_rms_db, ceiling=0.95):
    """Scale to target RMS (over the loudest 300 ms window) then limit peaks."""
    x = np.asarray(x, dtype=float)
    w = n(0.3)
    if len(x) > w:
        e = np.sqrt(np.convolve(np.square(x), np.ones(w) / w, mode="valid"))
        cur = float(e.max())
    else:
        cur = rms(x)
    if cur <= 1e-9:
        return x
    y = x * (10 ** (target_rms_db / 20) / cur)
    if peak(y) > ceiling:
        y = limiter(y, ceiling)
    return y


def resample(x, factor):
    """Playback-rate change (factor > 1 = higher pitch, shorter)."""
    x = np.asarray(x, dtype=float)
    N = int(len(x) / factor)
    return np.interp(np.arange(N) * factor, np.arange(len(x)), x)


def to_stereo(x, pan=0.0, width=0.0):
    """Equal-power pan (-1..1). width adds a tiny Haas offset for stereo feel."""
    x = np.asarray(x, dtype=float)
    a = (pan + 1) * math.pi / 4
    l, r = x * math.cos(a), x * math.sin(a)
    if width > 0:
        k = int(width * SR * 0.01)
        r = np.concatenate([np.zeros(k), r[:len(r) - k]]) if k > 0 else r
    return np.stack([l, r], axis=1)


def write_ogg(path, x, sr=SR, quality=0.5, block=32768):
    """Write OGG Vorbis in blocks (libsndfile's vorbis encoder segfaults on very large single writes)."""
    x = np.asarray(x, dtype=np.float32)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    ch = x.shape[1] if x.ndim == 2 else 1
    with sf.SoundFile(path, "w", samplerate=sr, channels=ch, format="OGG", subtype="VORBIS", compression_level=1.0 - quality) as f:
        for i in range(0, len(x), block):
            f.write(x[i:i + block])


def write_wav(path, x, sr=SR):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, np.asarray(x, dtype=np.float32), sr, format="WAV", subtype="PCM_16")


def save_manifest(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)


# ----------------------------------------------------------------- music helpers
NOTE_INDEX = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}


def note_to_midi(name: str) -> int:
    """'c4' = 60, 'f#3', 'bb2'."""
    s = name.strip().lower()
    i = 1
    semis = NOTE_INDEX[s[0]]
    while i < len(s) and s[i] in "#b":
        semis += 1 if s[i] == "#" else -1
        i += 1
    octave = int(s[i:])
    return 12 * (octave + 1) + semis


def midi_to_freq(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def nf(name: str) -> float:
    return midi_to_freq(note_to_midi(name))
