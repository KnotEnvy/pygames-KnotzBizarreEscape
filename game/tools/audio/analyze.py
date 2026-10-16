"""Audio QA: peak/RMS/duration per file, loop-seam check, waveform + spectrogram PNGs.
usage: python3 -I analyze.py <out_dir> [files or dirs...]   (default: public/assets/audio/{sfx,music})
"""
import math
import os
import sys

import numpy as np
import soundfile as sf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.normpath(os.path.join(HERE, "..", "..", "public", "assets", "audio"))


def db(v):
    return 20 * math.log10(max(float(v), 1e-9))


def spectrogram_png(x, sr, path, height=160, width=640):
    if x.ndim == 2:
        x = x.mean(axis=1)
    nfft = 1024
    hop = max(1, len(x) // width)
    frames = []
    win = np.hanning(nfft)
    for i in range(0, max(1, len(x) - nfft), hop):
        seg = x[i:i + nfft]
        if len(seg) < nfft:
            seg = np.pad(seg, (0, nfft - len(seg)))
        mag = np.abs(np.fft.rfft(seg * win))
        frames.append(mag)
        if len(frames) >= width:
            break
    S = np.array(frames).T  # freq x time
    S = 20 * np.log10(S + 1e-6)
    S = np.clip((S + 80) / 80, 0, 1)
    # log-frequency rows
    freqs = np.fft.rfftfreq(nfft, 1 / sr)
    rows = np.geomspace(40, sr / 2, height)
    idx = np.searchsorted(freqs, rows)
    idx = np.clip(idx, 0, S.shape[0] - 1)
    img = S[idx][::-1]
    rgb = np.zeros((img.shape[0], img.shape[1], 3), dtype=np.uint8)
    rgb[..., 0] = (np.clip(img * 2 - 0.6, 0, 1) * 255)
    rgb[..., 1] = (np.clip(img * 1.6 - 0.4, 0, 1) * 255)
    rgb[..., 2] = (np.clip(img * 1.2, 0, 1) * 200 + 20)
    Image.fromarray(rgb).save(path)


def waveform_png(x, sr, path, height=120, width=640):
    if x.ndim == 2:
        x = x.mean(axis=1)
    img = np.full((height, width, 3), 20, dtype=np.uint8)
    step = max(1, len(x) // width)
    for c in range(width):
        seg = x[c * step:(c + 1) * step]
        if len(seg) == 0:
            break
        lo, hi = seg.min(), seg.max()
        y0 = int((1 - hi) * (height - 1) / 2)
        y1 = int((1 - lo) * (height - 1) / 2)
        img[y0:y1 + 1, c] = (255, 174, 34)
    img[height // 2, :] = (120, 120, 140)
    Image.fromarray(img).save(path)


def analyze(path, out_dir, pngs=True):
    x, sr = sf.read(path, always_2d=False)
    mono = x.mean(axis=1) if x.ndim == 2 else x
    dur = len(mono) / sr
    pk = np.abs(x).max()
    r = math.sqrt(float(np.mean(mono ** 2)))
    w = int(sr * 0.3)
    if len(mono) > w:
        e = np.sqrt(np.convolve(mono ** 2, np.ones(w) / w, mode="valid"))
        rmax = float(e.max())
    else:
        rmax = r
    # loop seam: compare last and first 2 ms
    k = int(sr * 0.002)
    seam = float(np.abs(mono[-1] - mono[0])) if len(mono) > 2 else 0
    edge_rms = math.sqrt(float(np.mean(np.concatenate([mono[:k], mono[-k:]]) ** 2))) if len(mono) > 2 * k else 0
    clip = int(np.sum(np.abs(x) >= 0.999))
    name = os.path.splitext(os.path.basename(path))[0]
    if pngs:
        spectrogram_png(x, sr, os.path.join(out_dir, name + "_spec.png"))
        waveform_png(x, sr, os.path.join(out_dir, name + "_wave.png"))
    return dict(name=name, dur=dur, peak_db=db(pk), rms_db=db(r), rms_max_db=db(rmax), seam=seam, edge_rms_db=db(edge_rms), clipped=clip, ch=(x.shape[1] if x.ndim == 2 else 1), size=os.path.getsize(path))


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "/tmp/kbe-ui/audio"
    targets = sys.argv[2:] or [os.path.join(AUDIO, "sfx"), os.path.join(AUDIO, "music")]
    os.makedirs(out_dir, exist_ok=True)
    files = []
    for tgt in targets:
        if os.path.isdir(tgt):
            files += sorted(os.path.join(tgt, f) for f in os.listdir(tgt) if f.endswith((".ogg", ".wav")))
        else:
            files.append(tgt)
    print(f"{'file':28} {'dur':>6} {'peak':>6} {'rms':>6} {'rmsMx':>6} {'seam':>6} {'clip':>5} {'kB':>6}")
    total = 0
    for f in files:
        a = analyze(f, out_dir)
        total += a["size"]
        print(f"{a['name']:28} {a['dur']:6.2f} {a['peak_db']:6.1f} {a['rms_db']:6.1f} {a['rms_max_db']:6.1f} {a['seam']:6.3f} {a['clipped']:5d} {a['size']/1024:6.0f}")
    print(f"total {total/1024:.0f} kB in {len(files)} files")


if __name__ == "__main__":
    main()
