#!/usr/bin/env python3
"""
Banque de sons de « Billable Hours » (annexe C) générée hors ligne → public/audio/*.mp3
Licence : les nôtres (synthèse, aucun échantillon externe). Un vrai enregistrement déposé en .webm/.ogg
dans public/audio remplace automatiquement le fichier généré (le moteur préfère webm > ogg > mp3).

Techniques : synthèse modale (bois, métal, cloches), Karplus-Strong (cordes, contrebasse), FM (piano
électrique), pseudo-parole à formants (brouhaha, murmures de salle, radio), gouttes de pluie de Minnaert,
passages de voitures avec effet Doppler, réverbérations à convolution (réponses impulsionnelles par
bandes, décroissance plus rapide dans les aigus), boucles sans raccord (fondu croisé de la queue).

    python3 tools/make-sounds.py            # tout (numpy, scipy, soundfile)
    python3 tools/make-sounds.py gavel ...   # seulement les noms qui contiennent ces mots
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"
rng = np.random.default_rng(2026)


# =============================================================================== outils DSP
def n_of(sec: float) -> int:
    return int(round(sec * SR))


def tt(sec: float) -> np.ndarray:
    return np.arange(n_of(sec)) / SR


def white(sec: float) -> np.ndarray:
    return rng.standard_normal(n_of(sec))


def colored(sec: float, beta: float) -> np.ndarray:
    """Bruit en 1/f^beta (beta=1 rose, 2 brun), normalisé."""
    n = n_of(sec)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1]
    spec /= f ** (beta / 2)
    x = np.fft.irfft(spec, n)
    return x / (np.std(x) + 1e-9)


def sos(kind: str, freq, order=2):
    return signal.butter(order, freq, kind, fs=SR, output="sos")


def lp(x, f, order=2):
    return signal.sosfilt(sos("lowpass", min(f, SR / 2 - 100), order), x, axis=0)


def hp(x, f, order=2):
    return signal.sosfilt(sos("highpass", f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(sos("bandpass", [lo, min(hi, SR / 2 - 100)], order), x, axis=0)


def reson(x, f, q):
    b, a = signal.iirpeak(f, q, fs=SR)
    return signal.lfilter(b, a, x, axis=0)


def expdec(sec, tau):
    return np.exp(-tt(sec) / tau)


def ar(sec, attack, release):
    """Enveloppe attaque / relâchement linéaires sur `sec`."""
    n = n_of(sec)
    e = np.ones(n)
    a = max(1, n_of(attack))
    r = max(1, n_of(release))
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


def addp(*xs: np.ndarray) -> np.ndarray:
    """Somme de signaux de longueurs différentes (complétés par du silence)."""
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[: len(x)] += x
    return out


def norm(x, peak=0.9):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def db(v):
    return 10 ** (v / 20)


def mix_at(dst: np.ndarray, src: np.ndarray, at: float, gain=1.0, wrap=False):
    """Ajoute `src` dans `dst` à l'instant `at` (s). `wrap` : ce qui dépasse revient au début (boucles)."""
    i = n_of(at)
    n = len(dst)
    if i >= n and not wrap:
        return
    i %= n
    m = min(len(src), n - i)
    dst[i : i + m] += src[:m] * gain
    if wrap and len(src) > m:
        rest = src[m:]
        dst[: len(rest)] += rest[: n] * gain


def stereo(mono: np.ndarray, pan=0.0) -> np.ndarray:
    """Panoramique à puissance constante (-1 gauche … 1 droite)."""
    a = (pan + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def place_st(dst: np.ndarray, mono: np.ndarray, at: float, pan=0.0, gain=1.0, wrap=True):
    """Ajoute un son mono panoramiqué dans un tampon stéréo (en place)."""
    s = stereo(mono, pan) * gain
    n = len(dst)
    i = n_of(at)
    if i >= n and not wrap:
        return
    i %= n
    m = min(len(s), n - i)
    dst[i : i + m] += s[:m]
    if wrap and len(s) > m:
        rest = s[m:][:n]
        dst[: len(rest)] += rest


# ------------------------------------------------------------------------------- réverbération
_ir_cache: dict = {}


def impulse(seconds: float, damp: float, predelay=0.01, early=0.3, seed=1) -> np.ndarray:
    """RI stéréo : réflexions précoces + queue diffuse par bandes (les aigus s'éteignent plus vite)."""
    key = (seconds, damp, predelay, early, seed)
    if key in _ir_cache:
        return _ir_cache[key]
    g = np.random.default_rng(seed)
    n = n_of(seconds + predelay)
    ir = np.zeros((n, 2))
    t = np.arange(n) / SR
    bands = [(40, 250, 1.0), (250, 1200, 0.85), (1200, 4500, 0.6 - damp * 0.3), (4500, 16000, 0.35 - damp * 0.25)]
    for c in range(2):
        tail = np.zeros(n)
        for lo, hi, k in bands:
            tau = seconds / 6.9 * max(0.08, k)
            nb = bp(g.standard_normal(n), lo, hi, 2)
            tail += nb * np.exp(-np.maximum(t - predelay, 0) / tau)
        tail[: n_of(predelay)] = 0
        # réflexions précoces
        for _ in range(14):
            d = predelay + g.uniform(0.002, 0.07)
            i = n_of(d)
            if i < n:
                tail[i] += g.uniform(-1, 1) * early * 6
        ir[:, c] = tail
    ir /= np.sqrt(np.sum(ir**2, axis=0, keepdims=True)) + 1e-9
    _ir_cache[key] = ir
    return ir


def reverb(x: np.ndarray, seconds: float, wet: float, damp=0.5, predelay=0.015, seed=1) -> np.ndarray:
    """Convolution ; entrée mono ou stéréo, sortie stéréo de même longueur + queue."""
    ir = impulse(seconds, damp, predelay, seed=seed)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    out = np.zeros((len(x) + len(ir) - 1, 2))
    for c in range(2):
        out[:, c] = signal.fftconvolve(x[:, c], ir[:, c])
    dry = np.zeros_like(out)
    dry[: len(x)] = x
    return dry * (1 - wet * 0.5) + out * wet * 0.35


def loopify(x: np.ndarray, length: float, xfade=1.5) -> np.ndarray:
    """Boucle sans raccord : la fin (au-delà de `length`) est fondue dans le début."""
    n = n_of(length)
    f = n_of(xfade)
    out = x[:n].copy()
    tail = x[n : n + f]
    k = len(tail)
    if k:
        w = np.sin(np.linspace(0, np.pi / 2, k)) ** 2
        w = w[:, None] if out.ndim == 2 else w
        out[:k] = out[:k] * w + tail * (1 - w)
    return out


def wrap_tail(x: np.ndarray, length: float) -> np.ndarray:
    """Boucle musicale : tout ce qui dépasse la mesure finale est ajouté au début (réverb continue)."""
    n = n_of(length)
    out = x[:n].copy()
    rest = x[n:]
    while len(rest):
        m = min(n, len(rest))
        out[:m] += rest[:m]
        rest = rest[m:]
    return out


def save(name: str, x: np.ndarray, peak=0.89, kbps_quality=0.35):
    x = np.asarray(x, dtype=np.float64)
    x = x - np.mean(x, axis=0)
    x = norm(x, peak)
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.mp3"
    sf.write(path, x.astype(np.float32), SR, format="MP3", compression_level=kbps_quality)
    print(f"  {name}.mp3  {len(x) / SR:5.1f} s  {'stéréo' if x.ndim == 2 else 'mono  '}  {path.stat().st_size // 1024} Ko")


# =============================================================================== briques sonores
def modal(freqs, decays, amps, sec, strike=0.002) -> np.ndarray:
    """Impact modal : somme de partiels amortis + clic d'excitation."""
    t = tt(sec)
    y = np.zeros_like(t)
    for f, d, a in zip(freqs, decays, amps):
        y += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    click = white(sec) * np.exp(-t / strike)
    return y + click * 0.6


def wood_knock(sec=0.35, pitch=1.0, hard=1.0) -> np.ndarray:
    fs = np.array([180, 410, 690, 1130, 1720, 2600]) * pitch
    ds = np.array([0.09, 0.06, 0.045, 0.03, 0.02, 0.012]) * (1.1 - hard * 0.3)
    as_ = [1.0, 0.8, 0.6, 0.45, 0.3, 0.2]
    y = modal(fs, ds, as_, sec, strike=0.0015 * hard)
    return hp(y, 60)


def metal_click(sec=0.08, pitch=1.0) -> np.ndarray:
    fs = np.array([2300, 3700, 5200, 7100]) * pitch
    return hp(modal(fs, [0.02, 0.015, 0.01, 0.008], [1, 0.7, 0.5, 0.3], sec, 0.0006), 800)


def bell(f0, sec=3.0, bright=1.0) -> np.ndarray:
    ratios = [0.5, 1.0, 1.19, 1.56, 2.0, 2.51, 2.66, 3.01, 4.1]
    amps = [0.35, 1.0, 0.45, 0.35, 0.5, 0.25, 0.18, 0.12, 0.08]
    decs = [2.4, 1.8, 1.2, 1.0, 0.8, 0.5, 0.45, 0.35, 0.2]
    t = tt(sec)
    y = sum(a * bright ** i * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / d) for i, (r, a, d) in enumerate(zip(ratios, amps, decs)))
    return y * (1 - np.exp(-t / 0.002))


def ks_pluck(freq, sec, damp=0.996, bright=0.5, seed=None) -> np.ndarray:
    """Karplus-Strong (corde pincée)."""
    g = np.random.default_rng(seed)
    n = n_of(sec)
    p = max(2, int(SR / freq))
    buf = lp(g.uniform(-1, 1, p * 4), 800 + bright * 6000)[-p:]
    y = np.zeros(n)
    y[:p] = buf
    for i in range(p, n):
        y[i] = damp * 0.5 * (y[i - p] + y[i - p + 1 if i - p + 1 < i else i - p])
    return y


def ks_fast(freq, sec, damp=0.996, bright=0.5, seed=None) -> np.ndarray:
    """Karplus-Strong vectorisé par périodes (rapide pour les basses)."""
    g = np.random.default_rng(seed)
    n = n_of(sec)
    p = max(2, int(round(SR / freq)))
    cur = lp(g.uniform(-1, 1, p * 8), 300 + bright * 5000)[-p:]
    cur = cur / (np.max(np.abs(cur)) + 1e-9)
    chunks = []
    total = 0
    while total < n:
        chunks.append(cur)
        total += p
        nxt = 0.5 * (cur + np.roll(cur, -1)) * damp
        cur = nxt
    return np.concatenate(chunks)[:n]


def fm_epiano(freq, sec, vel=0.8) -> np.ndarray:
    """Piano électrique type Rhodes : FM 1:1 à indice décroissant + « tine » + trémolo léger."""
    t = tt(sec)
    idx = (1.8 * vel + 0.4) * np.exp(-t / 0.35) + 0.25
    mod = np.sin(2 * np.pi * freq * t) * idx
    car = np.sin(2 * np.pi * freq * t + mod)
    tine = 0.18 * vel * np.sin(2 * np.pi * freq * 14.2 * t) * np.exp(-t / 0.05)
    amp = np.exp(-t / (1.6 + 120 / freq)) * (1 - np.exp(-t / 0.003))
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.6 * t)
    return (car + tine) * amp * trem * vel


def glottal(f0: np.ndarray) -> np.ndarray:
    """Source glottique : dent de scie à bande limitée (PolyBLEP) avec pente spectrale naturelle."""
    ph = np.cumsum(f0 / SR) % 1.0
    dt = f0 / SR
    saw = 2 * ph - 1
    # PolyBLEP
    m1 = ph < dt
    x = ph[m1] / dt[m1]
    saw[m1] -= x + x - x * x - 1
    m2 = ph > 1 - dt
    x = (ph[m2] - 1) / dt[m2]
    saw[m2] -= x * x + x + x + 1
    g = -saw
    g = lp(lp(g, 900, 1), 3500, 1)
    return g


VOWELS = {
    "a": (750, 1200, 2500),
    "e": (450, 1800, 2550),
    "é": (380, 2100, 2700),
    "i": (290, 2250, 3000),
    "o": (500, 900, 2450),
    "ou": (320, 800, 2300),
    "u": (300, 1700, 2150),
    "eu": (420, 1400, 2400),
    "an": (620, 1100, 2500),
}


def pseudo_speech(sec: float, f0: float, seed: int, rate=4.6, breath=True) -> np.ndarray:
    """Parole inintelligible réaliste : syllabes voyelles/consonnes, intonation, pauses de phrase."""
    g = np.random.default_rng(seed)
    n = n_of(sec)
    hop = 256
    nb = n // hop + 1
    # --- plan des syllabes
    amp = np.zeros(nb)
    fcur = np.zeros((nb, 3))
    pitch = np.zeros(nb)
    noise_amp = np.zeros(nb)
    t = 0.0
    vkeys = list(VOWELS)
    last = VOWELS["e"]
    while t < sec:
        phrase = g.uniform(1.2, 3.4)
        t_end = min(sec, t + phrase)
        base = f0 * g.uniform(0.92, 1.08)
        while t < t_end:
            dur = g.uniform(0.11, 0.3) / (rate / 4.6)
            i0, i1 = int(t * SR / hop), int(min(n, (t + dur) * SR) / hop)
            if i1 <= i0:
                break
            v = VOWELS[vkeys[g.integers(len(vkeys))]]
            k = i1 - i0
            ramp = np.linspace(0, 1, k)[:, None]
            fcur[i0:i1] = np.array(last)[None] * (1 - np.minimum(1, ramp * 3)) + np.array(v)[None] * np.minimum(1, ramp * 3)
            last = v
            env = np.sin(np.linspace(0, np.pi, k)) ** 0.6 * g.uniform(0.6, 1.0)
            amp[i0:i1] = np.maximum(amp[i0:i1], env)
            # intonation : déclinaison sur la phrase + accent de syllabe
            prog = (t - (t_end - phrase)) / phrase
            pitch[i0:i1] = base * (1.12 - 0.22 * prog) * (1 + 0.05 * np.sin(np.linspace(0, np.pi, k)) * g.uniform(-1, 1.5))
            # consonne fricative / occlusive en attaque
            if g.random() < 0.55:
                c = min(k, int(g.uniform(0.03, 0.08) * SR / hop) + 1)
                noise_amp[i0 : i0 + c] = g.uniform(0.25, 0.6)
                amp[i0 : i0 + c] *= 0.3
            t += dur
        t = t_end + g.uniform(0.25, 0.9)  # pause (respiration)
    pitch[pitch == 0] = f0
    # interpolation par échantillon
    xs = np.arange(nb) * hop
    xi = np.arange(n)
    A = np.interp(xi, xs, amp)
    P = np.interp(xi, xs, pitch) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * xi / SR))  # vibrato naturel
    Nz = np.interp(xi, xs, noise_amp)
    src = glottal(P) * A
    # filtrage formantique variable, bloc par bloc (état conservé)
    y = np.zeros(n)
    zis = [None, None, None]
    bws = (90, 110, 150)
    gains = (1.0, 0.55, 0.3)
    for b in range(nb - 1):
        s0, s1 = b * hop, min(n, (b + 1) * hop)
        if s0 >= n:
            break
        seg = src[s0:s1]
        acc = np.zeros(s1 - s0)
        for j in range(3):
            f = float(np.clip(fcur[b, j] if fcur[b, j] > 0 else VOWELS["e"][j], 150, 4800))
            bb, aa = signal.iirpeak(f, f / bws[j], fs=SR)
            if zis[j] is None:
                zis[j] = signal.lfilter_zi(bb, aa) * 0
            out, zis[j] = signal.lfilter(bb, aa, seg, zi=zis[j])
            acc += out * gains[j]
        y[s0:s1] = acc
    fric = bp(g.standard_normal(n), 3500, 9000) * Nz * 0.07
    y = y + fric
    if breath:
        y += lp(hp(g.standard_normal(n), 800), 3000) * 0.004
    return y / (np.std(y) + 1e-9)


def babble(sec, voices, seed, spread=0.8, female=0.5, rate=4.6, lowpass=5000) -> np.ndarray:
    """Brouhaha stéréo : plusieurs locuteurs à des distances et positions différentes."""
    g = np.random.default_rng(seed)
    out = np.zeros((n_of(sec), 2))
    for v in range(voices):
        fem = g.random() < female
        f0 = g.uniform(185, 240) if fem else g.uniform(95, 135)
        s = pseudo_speech(sec, f0, seed * 100 + v, rate=rate * g.uniform(0.85, 1.15))
        dist = g.uniform(0.3, 1.0)
        s = lp(s, lowpass * (1.2 - dist * 0.7)) * (1.1 - dist * 0.8)
        out += stereo(s, g.uniform(-spread, spread))
    return out


def footstep(surface="marble", g=None) -> np.ndarray:
    """Pas de chaussure de ville : talon puis semelle ; timbre selon le sol."""
    g = g or rng
    if surface == "marble":
        heel = modal([900, 1900, 3100, 4700], [0.03, 0.02, 0.012, 0.008], [1, 0.7, 0.5, 0.3], 0.25, 0.0008)
        body = lp(white(0.25) * expdec(0.25, 0.012), 1200) * 0.6
        toe_g, toe_d = 0.45, 0.085
    elif surface == "wood":
        heel = wood_knock(0.25, pitch=g.uniform(0.9, 1.15), hard=0.7) * 0.8
        body = lp(white(0.25) * expdec(0.25, 0.02), 900) * 0.5
        toe_g, toe_d = 0.5, 0.09
    else:  # moquette
        heel = lp(white(0.25) * expdec(0.25, 0.025), 500) * 1.2
        body = lp(white(0.25) * expdec(0.25, 0.04), 250)
        toe_g, toe_d = 0.6, 0.11
    step = heel + body
    toe = np.roll(step, n_of(toe_d + g.uniform(-0.01, 0.015))) * toe_g
    toe[: n_of(toe_d)] = 0
    s = step + toe
    scuff = bp(white(0.25), 1500, 6000) * np.exp(-((tt(0.25) - 0.06) ** 2) / 0.0008) * 0.08
    return (s + scuff) * g.uniform(0.75, 1.0)


def rain_layer(sec, density, seed, bright=1.0, surface="street") -> np.ndarray:
    """Pluie : gouttes de Minnaert (bulles qui chantent) + impacts + nappe."""
    g = np.random.default_rng(seed)
    n = n_of(sec)
    out = np.zeros((n, 2))
    templates = []
    for _ in range(80):
        d = g.uniform(0.004, 0.02)
        tq = tt(d * 4)
        f = g.uniform(1400, 4800) * bright
        chirp = np.sin(2 * np.pi * f * tq * (1 + tq * g.uniform(8, 30))) * np.exp(-tq / d)
        click = g.standard_normal(len(tq)) * np.exp(-tq / 0.0007) * (0.8 if surface == "roof" else 0.4)
        templates.append(chirp * (0.4 if surface == "roof" else 1.0) + click)
    count = int(density * sec)
    for _ in range(count):
        tmp = templates[g.integers(len(templates))]
        place_st(out, tmp, g.uniform(0, sec), g.uniform(-0.9, 0.9), g.uniform(0.05, 0.4) ** 1.5)
    hiss = np.stack([colored(sec, 0.6), colored(sec, 0.6)], axis=1)
    hiss = bp(hiss, 900 * bright, 9000) * 0.12
    return out + hiss


def car_pass(sec, seed, speed=1.0) -> np.ndarray:
    """Voiture qui passe sur chaussée mouillée : chuintement des pneus, moteur, Doppler, panoramique."""
    g = np.random.default_rng(seed)
    t = tt(sec)
    mid = sec / 2
    x = (t - mid) * 12 * speed  # position (m) le long de la rue
    d = np.sqrt(x**2 + 6**2)
    gain = 1 / (d / 6) ** 1.4
    tires = bp(colored(sec, 1.0), 300, 5000) * 0.6 + bp(white(sec), 2500, 9000) * 0.25
    doppler = 1 + np.clip(-x / d, -1, 1) * 0.06
    f_eng = 42 * speed * doppler
    ph = np.cumsum(f_eng / SR) * 2 * np.pi
    engine = (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3 * ph)) * 0.25
    mono = (tires + lp(engine, 400)) * gain
    pan = np.clip(x / 18, -1, 1) * (1 if g.random() < 0.5 else -1)
    a = (pan + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def keyboard_burst(keys: int, g) -> np.ndarray:
    dur = keys / g.uniform(6, 9) + 0.3
    out = np.zeros(n_of(dur))
    t = 0.05
    for _ in range(keys):
        k = modal([g.uniform(1800, 2600), g.uniform(3400, 4600)], [0.012, 0.008], [1, 0.6], 0.06, 0.0005)
        k += lp(white(0.06) * expdec(0.06, 0.004), 800) * 0.4
        mix_at(out, k, t, g.uniform(0.3, 0.8))
        t += g.uniform(0.08, 0.2)
    return hp(out, 300)


def cough(g) -> np.ndarray:
    s = 0.5
    y = bp(white(s), 250, 2500) * (expdec(s, 0.08) - expdec(s, 0.005))
    y = reson(y, g.uniform(500, 800), 3) + reson(y, g.uniform(1100, 1600), 4) * 0.5
    y2 = np.roll(y, n_of(0.22)) * 0.6
    return (y + y2) * 0.8


def creak(sec, g, f=180) -> np.ndarray:
    """Craquement de bois (banc, parquet) : friction en impulsions rapprochées."""
    n = n_of(sec)
    y = np.zeros(n)
    rate = np.linspace(f * 0.6, f * 1.3, n) * (1 + 0.2 * np.sin(np.linspace(0, 9, n)))
    ph = np.cumsum(rate / SR)
    pulses = np.diff(np.floor(ph), prepend=0) > 0
    y[pulses] = g.uniform(0.3, 1.0, pulses.sum())
    y = reson(y, 700, 3) + reson(y, 1500, 5) * 0.5
    return y * np.sin(np.linspace(0, np.pi, n)) ** 0.5


def hum(sec, f=60, harm=(1, 2, 3, 4), amps=(1, 0.5, 0.3, 0.2)) -> np.ndarray:
    t = tt(sec)
    return sum(a * np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) for h, a in zip(harm, amps))


def hvac(sec) -> np.ndarray:
    x = np.stack([colored(sec, 1.6), colored(sec, 1.6)], axis=1)
    return lp(hp(x, 40), 700) * 0.5


def speech_radio(sec, seed, f0=120) -> np.ndarray:
    s = pseudo_speech(sec, f0, seed, rate=5.2)
    s = bp(s, 350, 3200, 3)
    s = np.tanh(s * 2.5) * 0.5
    return s


# =============================================================================== AMBIANCES (stéréo)
def amb_courtroom():
    L = 40.0
    sec = L + 3
    g = np.random.default_rng(11)
    out = hvac(sec) * 0.35
    out += stereo(lp(hum(sec, 60, (2, 4), (0.4, 0.15)), 400) * 0.02)
    # public : chuchotements lointains, très bas
    mur = babble(sec, 5, 31, spread=0.9, rate=4.0, lowpass=2200) * 0.05
    out += mur
    dry = np.zeros((n_of(sec), 2))
    for _ in range(7):
        place_st(dry, cough(g), g.uniform(0, L), g.uniform(-0.9, 0.9), g.uniform(0.15, 0.35))
    for _ in range(9):
        place_st(dry, creak(g.uniform(0.3, 0.8), g, g.uniform(120, 260)), g.uniform(0, L), g.uniform(-1, 1), g.uniform(0.05, 0.12))
    for _ in range(10):
        place_st(dry, paper_rustle(g.uniform(0.3, 0.9), g), g.uniform(0, L), g.uniform(-0.8, 0.8), g.uniform(0.08, 0.2))
    for _ in range(3):  # pas lointains sur parquet
        t0 = g.uniform(0, L - 4)
        pan = g.uniform(-1, 1)
        for k in range(6):
            place_st(dry, footstep("wood", g), t0 + k * 0.55, pan, 0.08)
    out += reverb(dry, 1.9, 0.9, damp=0.55)[: n_of(sec)]
    return loopify(out, L, 2.5)


def paper_rustle(sec, g) -> np.ndarray:
    n = n_of(sec)
    y = bp(g.standard_normal(n), 1200, 9000) * np.abs(lp(g.standard_normal(n), 25)) * 3
    crackle = (g.random(n) < 0.004) * g.uniform(-1, 1, n)
    y += hp(crackle, 2000) * 0.8
    return y * np.sin(np.linspace(0, np.pi, n))


def amb_office_night():
    L = 32.0
    sec = L + 2
    g = np.random.default_rng(12)
    out = hvac(sec) * 0.5
    ballast = hum(sec, 120, (1, 2, 3, 5, 7), (1, 0.6, 0.35, 0.2, 0.12))
    buzz = bp(ballast + 0.15 * np.sign(np.sin(2 * np.pi * 120 * tt(sec))), 100, 4000) * 0.03
    flick = 1 + 0.25 * (np.abs(lp(g.standard_normal(n_of(sec)), 3)) > 1.4)
    out += stereo(buzz * flick, -0.3)
    city = lp(np.stack([colored(sec, 1.2), colored(sec, 1.2)], axis=1), 350) * 0.25
    out += city
    for _ in range(3):
        place_st(out, lp(car_pass(8, g.integers(1e6), 0.8).mean(axis=1), 900) * 0.15, g.uniform(0, L), g.uniform(-0.5, 0.5))
    for _ in range(3):
        place_st(out, creak(g.uniform(0.3, 0.6), g, 90) * 0.04, g.uniform(0, L), g.uniform(-1, 1))
    return loopify(out, L)


def amb_office_day():
    L = 32.0
    sec = L + 2
    g = np.random.default_rng(13)
    out = hvac(sec) * 0.45
    out += lp(babble(sec, 6, 41, 0.9, lowpass=1600), 900) * 0.07  # derrière la porte
    out += lp(np.stack([colored(sec, 1.2), colored(sec, 1.2)], axis=1), 300) * 0.2
    for _ in range(5):
        kb = keyboard_burst(int(g.integers(4, 14)), g)
        place_st(out, lp(kb, 2500) * 0.05, g.uniform(0, L), g.uniform(-0.8, 0.8))
    return loopify(out, L)


def amb_openspace():
    L = 40.0
    sec = L + 2
    g = np.random.default_rng(14)
    out = hvac(sec) * 0.4
    out += reverb(babble(sec, 9, 51, 1.0, lowpass=4200) * 0.16, 1.0, 0.5, 0.7)[: n_of(sec)]
    dry = np.zeros((n_of(sec), 2))
    for _ in range(16):
        place_st(dry, keyboard_burst(int(g.integers(5, 20)), g) * 0.12, g.uniform(0, L), g.uniform(-1, 1))
    for _ in range(3):
        ring = desk_phone_ring(1) * 0.05
        place_st(dry, lp(ring, 3000), g.uniform(0, L), g.uniform(-1, 1))
    for _ in range(5):
        place_st(dry, creak(0.4, g, 200) * 0.05, g.uniform(0, L), g.uniform(-1, 1))
    for _ in range(4):
        place_st(dry, paper_rustle(0.6, g) * 0.1, g.uniform(0, L), g.uniform(-1, 1))
    out += reverb(dry, 1.1, 0.6, 0.7)[: n_of(sec)]
    return loopify(out, L)


def amb_conversation():
    L = 24.0
    sec = L + 2
    out = babble(sec, 3, 61, 0.4, female=0.5, rate=4.8, lowpass=5500) * 0.6
    return loopify(reverb(out, 0.8, 0.4, 0.8)[: n_of(sec)], L)


def amb_lobby_marble():
    L = 40.0
    sec = L + 4
    g = np.random.default_rng(15)
    out = hvac(sec) * 0.3
    dry = np.zeros((n_of(sec), 2))
    for _ in range(6):
        t0 = g.uniform(0, L - 5)
        pan0, pan1 = g.uniform(-1, 1), g.uniform(-1, 1)
        steps = int(g.integers(5, 10))
        for k in range(steps):
            place_st(dry, footstep("marble", g), t0 + k * g.uniform(0.5, 0.6), pan0 + (pan1 - pan0) * k / steps, g.uniform(0.05, 0.12))
    dry += babble(sec, 4, 71, 0.9, lowpass=2500) * 0.03
    ding = bell(1318, 2.5) * 0.02
    place_st(dry, ding, g.uniform(5, L - 5), 0.7)
    out += reverb(dry, 3.6, 1.0, damp=0.25, predelay=0.03)[: n_of(sec)]
    return loopify(out, L, 3)


def amb_elevator():
    L = 30.0
    sec = L + 2
    g = np.random.default_rng(16)
    motor = hum(sec, 50, (1, 2, 3, 6), (1, 0.6, 0.3, 0.15)) * 0.06
    whine = np.sin(2 * np.pi * np.cumsum(np.full(n_of(sec), 820.0) * (1 + 0.004 * np.sin(np.linspace(0, 20, n_of(sec))))) / SR) * 0.004
    wind = np.stack([colored(sec, 1.0), colored(sec, 1.0)], axis=1)
    wind = bp(wind, 200, 2000) * (0.6 + 0.4 * np.abs(lp(g.standard_normal(n_of(sec)), 0.3)))[:, None] * 0.35
    whistle = reson(white(sec), 950, 30) * (0.5 + 0.5 * np.sin(np.linspace(0, 11, n_of(sec)))) * 0.08
    out = wind + stereo(motor + whine) + stereo(whistle, 0.4)
    for _ in range(5):
        place_st(out, creak(0.5, g, 70) * 0.05, g.uniform(0, L), g.uniform(-0.6, 0.6))
    return loopify(out, L)


def amb_rain_taxi():
    wiper = 1.6
    L = wiper * 20
    sec = L + 2
    g = np.random.default_rng(17)
    out = rain_layer(sec, 700, 171, 0.8, surface="roof") * 0.5
    out = lp(out, 5000)
    eng = lp(hum(sec, 31, (1, 2, 3, 4), (1, 0.6, 0.4, 0.2)), 300) * 0.25
    out += stereo(eng)
    for k in range(int(L / wiper) + 1):
        t0 = k * wiper
        thunk = wood_knock(0.2, 0.5, 0.4) * 0.12 + lp(white(0.2) * expdec(0.2, 0.02), 300) * 0.3
        squeak = bp(white(0.5), 900, 3000) * np.sin(np.linspace(0, np.pi, n_of(0.5))) * 0.05
        motor = lp(bp(white(0.7), 80, 400), 300) * np.sin(np.linspace(0, np.pi, n_of(0.7))) * 0.25
        place_st(out, thunk, t0 + 0.7, 0.0)
        place_st(out, squeak + np.pad(motor, (0, 0))[: n_of(0.5)], t0, (-1) ** k * 0.4)
    for _ in range(3):
        place_st(out, lp(car_pass(7, g.integers(1e6), 1.1).mean(axis=1), 1400) * 0.25, g.uniform(0, L), g.uniform(-0.8, 0.8))
    return loopify(out, L)


def amb_street_rain():
    L = 40.0
    sec = L + 3
    g = np.random.default_rng(18)
    out = rain_layer(sec, 1100, 181, 1.0) * 0.55
    out += np.stack([colored(sec, 1.8), colored(sec, 1.8)], axis=1) * 0.12  # rumeur de la ville
    for i in range(7):
        c = car_pass(g.uniform(5, 8), 1000 + i, g.uniform(0.8, 1.3)) * g.uniform(0.25, 0.5)
        place_st(out, c[:, 0], g.uniform(0, L), -0.4)
        place_st(out, c[:, 1], g.uniform(0, L), 0.4)
    horn = lp(np.sign(np.sin(2 * np.pi * 410 * tt(0.5))) + np.sign(np.sin(2 * np.pi * 520 * tt(0.5))), 2500) * ar(0.5, 0.02, 0.08) * 0.02
    place_st(out, reverb(horn, 2.0, 0.8)[:, 0], g.uniform(5, L - 5), 0.6)
    drips = np.zeros((n_of(sec), 2))
    for _ in range(40):
        d = modal([g.uniform(900, 2400)], [0.03], [1], 0.1, 0.0005)
        place_st(drips, d, g.uniform(0, L), g.uniform(-0.6, 0.6), g.uniform(0.03, 0.1))
    out += drips
    return loopify(out, L)


def amb_courthouse_steps():
    L = 40.0
    sec = L + 3
    g = np.random.default_rng(19)
    out = np.stack([colored(sec, 1.7), colored(sec, 1.7)], axis=1) * 0.25
    for i in range(9):
        c = car_pass(g.uniform(5, 8), 2000 + i, g.uniform(0.7, 1.2)) * g.uniform(0.15, 0.35)
        place_st(out, c.mean(axis=1), g.uniform(0, L), g.uniform(-0.8, 0.8))
    press = babble(sec, 8, 81, 1.0, female=0.4, rate=5.2, lowpass=4500) * 0.12
    out += reverb(press, 1.2, 0.3, 0.6)[: n_of(sec)]
    for _ in range(9):  # rafales d'appareils photo
        t0 = g.uniform(0, L - 2)
        pan = g.uniform(-0.8, 0.8)
        for k in range(int(g.integers(2, 7))):
            place_st(out, shutter() * 0.25, t0 + k * g.uniform(0.09, 0.16), pan)
    for _ in range(4):  # pigeons qui s'envolent
        flap = np.zeros(n_of(1.2))
        for k in range(10):
            mix_at(flap, lp(white(0.06) * expdec(0.06, 0.012), 3000), k * 0.1, 0.5)
        place_st(out, flap * 0.12, g.uniform(0, L), g.uniform(-1, 1))
    siren = np.sin(2 * np.pi * np.cumsum(700 + 250 * np.sin(np.linspace(0, 2 * np.pi * 3, n_of(6)))) / SR)
    siren = lp(siren, 2000) * np.sin(np.linspace(0, np.pi, n_of(6))) * 0.02
    place_st(out, reverb(siren, 2.5, 0.8)[:, 0], g.uniform(5, L - 10), -0.7)
    return loopify(out, L)


def amb_conference():
    L = 30.0
    sec = L + 2
    out = hvac(sec) * 0.35
    out += lp(np.stack([colored(sec, 1.5), colored(sec, 1.5)], axis=1), 250) * 0.15
    g = np.random.default_rng(20)
    for _ in range(3):
        place_st(out, lp(car_pass(8, g.integers(1e6), 0.9).mean(axis=1), 600) * 0.06, g.uniform(0, L), g.uniform(-0.5, 0.5))
    return loopify(out, L)


def amb_printer():
    L = 16.0
    sec = L + 1
    fan = hp(lp(colored(sec, 1.0), 1800), 150) * 0.2
    out = fan.copy()
    for k in range(int(L / 2.0)):
        t0 = k * 2.0
        feed = bp(white(0.9), 300, 2500) * (np.abs(np.sin(np.linspace(0, 40 * np.pi, n_of(0.9)))) ** 3) * 0.5
        mix_at(out, feed, t0 + 0.2, 1, wrap=True)
        mix_at(out, wood_knock(0.15, 1.8, 0.8) * 0.15, t0 + 1.3, 1, wrap=True)
    return loopify(np.stack([out, out * 0.95], axis=1), L, 0.5)


def amb_taxi_radio():
    L = 24.0
    sec = L + 1
    talk = speech_radio(sec, 91, 118) * 0.6
    music = bp(sum(np.sin(2 * np.pi * f * tt(sec)) * np.exp(-((tt(sec) % 0.7) / 0.25)) for f in (196, 247, 294)), 300, 2500) * 0.15
    static = hp(white(sec), 2000) * 0.03
    x = talk * (tt(sec) < 16) + music * (tt(sec) >= 15) + static
    return loopify(stereo(x, 0.3), L, 1)


def amb_lobby_radio():
    L = 30.0
    sec = L + 1
    out = np.zeros(n_of(sec))
    g = np.random.default_rng(92)
    t = 1.0
    while t < L:
        d = g.uniform(1.2, 3.0)
        burst = speech_radio(d, int(g.integers(1e6)), g.uniform(100, 140)) * ar(d, 0.02, 0.05)
        squelch = hp(white(0.12), 1500) * 0.3
        mix_at(out, squelch, t - 0.12)
        mix_at(out, burst * 0.6, t)
        mix_at(out, squelch, t + d)
        t += d + g.uniform(4, 9)
    return loopify(stereo(out), L, 0.5)


def amb_computer_fan():
    L = 16.0
    sec = L + 1
    fan = hp(lp(colored(sec, 1.2), 900), 60) * 0.3 + hum(sec, 97, (1, 2), (0.05, 0.02))
    return loopify(stereo(fan), L, 1)


# =============================================================================== BRUITAGES (mono)
def desk_phone_ring(cycles=2) -> np.ndarray:
    out = np.zeros(n_of(4.0 * cycles))
    for c in range(cycles):
        t = tt(1.6)
        trill = np.where(np.sin(2 * np.pi * 18 * t) > 0, 1.0, 0.0)
        tone = np.sin(2 * np.pi * 1020 * t) * trill + np.sin(2 * np.pi * 1270 * t) * (1 - trill)
        tone = lp(tone, 4000) * ar(1.6, 0.01, 0.05)
        body = reson(tone, 1100, 2) * 0.4
        mix_at(out, tone + body, c * 4.0)
    return out


def shutter() -> np.ndarray:
    a = metal_click(0.05, 1.3) * 0.8 + lp(white(0.05) * expdec(0.05, 0.004), 2000) * 0.5
    b = np.roll(a, n_of(0.045)) * 0.7
    return a + b


def sfx_gavel():
    out = np.zeros(n_of(1.4))
    for k, (at, g) in enumerate([(0.0, 1.0), (0.32, 0.8)]):
        knock = wood_knock(0.5, pitch=0.85, hard=1.0) * 1.0
        thump = np.sin(2 * np.pi * 95 * tt(0.5)) * expdec(0.5, 0.05) * 0.8
        mix_at(out, (knock + thump) * g, at)
    return reverb(out, 1.8, 0.45, 0.55).mean(axis=1)[: n_of(2.6)]


def sfx_objection():
    """Coup de théâtre : impact grave (taiko), claquement, souffle qui retombe."""
    sec = 2.2
    t = tt(sec)
    f = 95 * np.exp(-t / 0.25) + 42
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45)
    skin = lp(white(sec), 1800) * np.exp(-t / 0.03) * 0.6
    slap = hp(white(sec), 2000) * np.exp(-t / 0.012) * 0.35
    whoosh = bp(white(sec), 400, 6000) * np.exp(-((t - 0.05) ** 2) / 0.01) * 0.15
    x = body + skin + slap + whoosh
    return reverb(x, 2.2, 0.5, 0.5).mean(axis=1)[: n_of(sec + 1)]


def sfx_reveal():
    """Révélation (bonne connexion) : accord de cloches qui s'ouvre + souffle inversé."""
    sec = 2.8
    swell = bp(white(sec), 2000, 9000) * (tt(sec) / sec) ** 3 * (tt(sec) < 0.6) * 0.3
    chord = np.zeros(n_of(sec))
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        mix_at(chord, bell(f, 2.2, 0.8) * 0.3, 0.55 + i * 0.03)
    x = np.pad(swell[: n_of(0.6)], (0, n_of(sec) - n_of(0.6))) + chord
    return reverb(x, 2.4, 0.6, 0.3).mean(axis=1)[: n_of(sec + 1)]


def sfx_string_tense():
    """Fil rouge tiré puis tendu : frottement qui monte, « twang » de la corde."""
    sec = 1.3
    g = np.random.default_rng(3)
    rub = creak(0.45, g, 320) * 0.4
    twang_f = 170
    pluck = ks_fast(twang_f, 1.0, 0.9975, 0.7, seed=4)
    bend = np.interp(np.arange(len(pluck)) * (1 + 0.03 * np.exp(-tt(1.0) / 0.1)), np.arange(len(pluck)), pluck)
    out = np.zeros(n_of(sec))
    mix_at(out, rub, 0.0)
    mix_at(out, bend * 0.7, 0.4)
    return hp(out, 90)


def sfx_crowd_murmur():
    sec = 4.0
    b = babble(sec, 14, 101, 1.0, rate=5.5, lowpass=3500)
    env = np.clip(tt(sec) / 0.35, 0, 1) * np.exp(-np.maximum(tt(sec) - 1.2, 0) / 1.1)
    b = b * env[:, None]
    ooh = np.zeros(n_of(sec))
    for v in range(8):
        f0 = rng.uniform(110, 230)
        vo = glottal(np.full(n_of(1.4), f0) * np.linspace(1.05, 0.92, n_of(1.4)))
        vo = reson(vo, 450, 5) + reson(vo, 850, 6) * 0.6
        mix_at(ooh, vo * np.sin(np.linspace(0, np.pi, len(vo))) * 0.2, 0.1 + rng.uniform(0, 0.25))
    x = b.mean(axis=1) * 0.8 + ooh * 0.5
    return reverb(x, 1.8, 0.7, 0.55).mean(axis=1)[: n_of(sec + 1)]


def sfx_crowd_gasp():
    sec = 1.6
    out = np.zeros(n_of(sec))
    for v in range(12):
        d = rng.uniform(0.25, 0.45)
        inh = bp(white(d), rng.uniform(700, 1400), 4500) * np.sin(np.linspace(0, np.pi, n_of(d))) ** 2
        mix_at(out, inh * rng.uniform(0.3, 0.8), rng.uniform(0, 0.15))
    return reverb(out, 1.8, 0.7).mean(axis=1)[: n_of(sec + 0.8)]


def sfx_heartbeat():
    """Battements (boucle de 4 s, 75 bpm) : « poum-poum » grave et étouffé."""
    L = 4.0
    out = np.zeros(n_of(L))
    period = 60 / 75
    for k in range(int(L / period)):
        for dt, g in ((0.0, 1.0), (0.2, 0.7)):
            t = tt(0.3)
            beat = np.sin(2 * np.pi * (55 - 20 * t) * t) * np.exp(-t / 0.06) * g
            mix_at(out, lp(beat, 150), k * period + dt, wrap=True)
    return out


def sfx_clock_tick():
    """Tic-tac mécanique (boucle de 2 s)."""
    out = np.zeros(n_of(2.0))
    for k in range(2):
        tick = addp(metal_click(0.06, 1.0 if k == 0 else 0.82) * 0.6, wood_knock(0.1, 3.2, 1.0) * 0.4)
        mix_at(out, tick, k * 1.0, wrap=True)
    return out


def sfx_pin():
    click = metal_click(0.05, 1.5) * 0.5
    cork = lp(white(0.15) * expdec(0.15, 0.02), 900) * 0.8
    push = bp(white(0.12), 400, 2500) * ar(0.12, 0.08, 0.01) * 0.2
    out = np.zeros(n_of(0.25))
    mix_at(out, push, 0)
    mix_at(out, click + np.pad(cork, (0, 0))[: n_of(0.05)] * 0, 0.1)
    mix_at(out, cork, 0.1)
    return out


def sfx_paper_slide():
    g = np.random.default_rng(5)
    sec = 0.8
    n = n_of(sec)
    fr = bp(g.standard_normal(n), 1500, 8000) * (0.6 + 0.4 * np.abs(lp(g.standard_normal(n), 60)))
    env = np.sin(np.linspace(0, np.pi, n)) ** 0.7 * np.linspace(1, 0.6, n)
    return fr * env


def sfx_paper_flip():
    g = np.random.default_rng(6)
    sec = 0.45
    x = paper_rustle(sec, g) * 1.2
    whoosh = bp(white(sec), 300, 2000) * np.sin(np.linspace(0, np.pi, n_of(sec))) * 0.4
    snap = hp(white(0.02) * expdec(0.02, 0.003), 1500)
    out = x + whoosh
    mix_at(out, snap * 0.7, 0.3)
    return out


def sfx_highlighter():
    g = np.random.default_rng(7)
    sec = 0.7
    n = n_of(sec)
    squeak = reson(g.standard_normal(n), 3800, 6) * (0.5 + 0.5 * np.abs(lp(g.standard_normal(n), 40)))
    felt = bp(g.standard_normal(n), 1500, 6000) * 0.4
    uncap = metal_click(0.04, 0.9) * 0.0
    return (squeak * 0.4 + felt) * ar(sec, 0.03, 0.1) + np.pad(uncap, (0, n - len(uncap)))


def sfx_stamp():
    out = np.zeros(n_of(0.6))
    thump = np.sin(2 * np.pi * 85 * tt(0.3)) * expdec(0.3, 0.05)
    mix_at(out, thump + wood_knock(0.3, 0.9, 0.6) * 0.5, 0.0)
    squish = bp(white(0.15), 300, 2000) * ar(0.15, 0.01, 0.1) * 0.15
    mix_at(out, squish, 0.02)
    return out


def sfx_typewriter_soft():
    g = np.random.default_rng(8)
    return keyboard_burst(10, g)


def sfx_briefcase_open():
    out = np.zeros(n_of(1.4))
    for at in (0.05, 0.28):
        mix_at(out, addp(metal_click(0.1, 0.7) * 0.8, lp(white(0.08) * expdec(0.08, 0.01), 1500) * 0.3), at)
    g = np.random.default_rng(9)
    mix_at(out, creak(0.7, g, 90) * 0.35, 0.55)
    return out


def sfx_coins_counter():
    out = np.zeros(n_of(3.2))
    t = 0.0
    k = 0
    while t < 2.5:
        mix_at(out, metal_click(0.04, 1.1 + 0.1 * (k % 2)) * 0.5, t)
        t += max(0.03, 0.16 * np.exp(-t * 1.2))
        k += 1
    mix_at(out, bell(1568, 1.2) * 0.3, 2.55)
    return out


def sfx_footsteps():
    g = np.random.default_rng(10)
    out = np.zeros(n_of(2.6))
    for k in range(4):
        mix_at(out, footstep("marble", g), 0.05 + k * 0.52)
    return reverb(out, 0.9, 0.25, 0.6).mean(axis=1)


def sfx_camera_flash():
    whine = np.sin(2 * np.pi * np.cumsum(np.linspace(3000, 7500, n_of(0.5))) / SR) * ar(0.5, 0.05, 0.05) * 0.05
    out = np.zeros(n_of(0.8))
    mix_at(out, whine, 0)
    mix_at(out, shutter() * 0.9, 0.5)
    pop = lp(white(0.05) * expdec(0.05, 0.005), 3000) * 0.5
    mix_at(out, pop, 0.5)
    return out


def sfx_car_door():
    out = np.zeros(n_of(1.0))
    thud = np.sin(2 * np.pi * 70 * tt(0.4)) * expdec(0.4, 0.07) + lp(white(0.4) * expdec(0.4, 0.02), 500)
    metal = modal([420, 980, 1650], [0.08, 0.05, 0.03], [0.4, 0.3, 0.2], 0.4)
    mix_at(out, thud + metal * 0.5, 0.05)
    mix_at(out, metal_click(0.05, 0.6) * 0.3, 0.02)
    return out


def sfx_badge_beep():
    out = np.zeros(n_of(0.35))
    for at in (0.0, 0.14):
        b = np.sin(2 * np.pi * 2730 * tt(0.09)) * ar(0.09, 0.003, 0.01)
        mix_at(out, b, at)
    return out * 0.6


def sfx_badge_print():
    sec = 2.2
    t = tt(sec)
    step = np.sin(2 * np.pi * 420 * t) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 36 * t)))
    motor = bp(step, 300, 3000) * 0.3 + bp(white(sec), 600, 4000) * 0.08
    return motor * ar(sec, 0.05, 0.2)


def sfx_turnstile():
    out = np.zeros(n_of(1.2))
    mix_at(out, metal_click(0.1, 0.5) * 0.7, 0.0)
    motor = bp(white(0.6), 150, 900) * np.sin(np.linspace(0, np.pi, n_of(0.6))) * 0.4
    mix_at(out, motor, 0.1)
    mix_at(out, addp(wood_knock(0.2, 0.6, 1.0) * 0.4, metal_click(0.08, 0.45) * 0.5), 0.75)
    return out


def sfx_elevator_ding():
    out = np.zeros(n_of(3.0))
    mix_at(out, bell(1318.5, 2.5) * 0.6, 0.0)
    mix_at(out, bell(1046.5, 2.5) * 0.6, 0.45)
    return out


def sfx_elevator_doors():
    sec = 2.4
    motor = hum(sec, 70, (1, 2, 3), (1, 0.5, 0.25)) * 0.1
    slide = bp(white(sec), 200, 1500) * 0.3
    env = ar(sec, 0.2, 0.4)
    out = (motor + slide) * env
    mix_at(out, wood_knock(0.2, 0.5, 0.8) * 0.4, 2.0)
    return out


def sfx_door_revolving():
    sec = 2.4
    g = np.random.default_rng(11)
    seal = np.zeros(n_of(sec))
    for k in range(4):
        sw = bp(white(0.4), 400, 3000) * np.sin(np.linspace(0, np.pi, n_of(0.4))) * 0.4
        mix_at(seal, sw, 0.1 + k * 0.5)
    air = lp(white(sec), 700) * ar(sec, 0.3, 0.8) * 0.3
    creaks = creak(1.8, g, 60) * 0.15
    return seal + air + np.pad(creaks, (0, n_of(sec) - len(creaks)))


def sfx_phone_vibrate():
    out = np.zeros(n_of(1.4))
    for at in (0.0, 0.7):
        t = tt(0.4)
        buzz = np.sign(np.sin(2 * np.pi * 165 * t)) * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * t))
        buzz = lp(buzz, 1200) * ar(0.4, 0.01, 0.03)
        rattle = bp(white(0.4), 1000, 4000) * (np.abs(np.sin(2 * np.pi * 82 * t)) > 0.95) * 0.3
        mix_at(out, buzz * 0.5 + rattle, at)
    return out


def sfx_desk_knock():
    out = np.zeros(n_of(1.3))
    for k in range(3):
        mix_at(out, wood_knock(0.35, 0.7, 0.9), k * 0.19)
    return reverb(out, 0.6, 0.3, 0.8).mean(axis=1)


def sfx_ball_bounce():
    t = tt(0.25)
    return np.sin(2 * np.pi * (140 - 60 * t) * t) * np.exp(-t / 0.035) + lp(white(0.25) * expdec(0.25, 0.006), 1200) * 0.4


def sfx_notification():
    out = np.zeros(n_of(1.2))
    for at, f in ((0.0, 880), (0.12, 1318.5)):
        m = modal([f, f * 3.9, f * 9.1], [0.35, 0.08, 0.03], [1, 0.2, 0.05], 0.8, 0.0005)
        mix_at(out, m * 0.6, at)
    return out


def sfx_ui_hover():
    return addp(metal_click(0.04, 1.6) * 0.15, wood_knock(0.06, 4.0, 1.0) * 0.1)


def sfx_screw():
    g = np.random.default_rng(12)
    out = np.zeros(n_of(1.6))
    for k in range(9):
        mix_at(out, addp(metal_click(0.03, g.uniform(0.8, 1.0)) * 0.3, creak(0.12, g, 400) * 0.15), k * 0.16)
    return out


def sfx_boxes():
    out = np.zeros(n_of(1.6))
    for at in (0.0, 0.5):
        thud = lp(white(0.4) * expdec(0.4, 0.05), 400) + np.sin(2 * np.pi * 80 * tt(0.4)) * expdec(0.4, 0.06)
        mix_at(out, thud * 0.8, at)
        mix_at(out, paper_rustle(0.4, rng) * 0.3, at + 0.02)
    return out


def sfx_whoosh():
    sec = 0.6
    t = tt(sec)
    fc = 300 + 5000 * (t / sec) ** 2
    x = white(sec)
    y = np.zeros_like(x)
    zi = None
    hop = 512
    for i in range(0, len(x), hop):
        b, a = signal.iirpeak(min(fc[i], 15000), 1.5, fs=SR)
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        y[i : i + hop], zi = signal.lfilter(b, a, x[i : i + hop], zi=zi)
    return y * np.sin(np.linspace(0, np.pi, len(y))) ** 2


def sfx_shutter_burst():
    out = np.zeros(n_of(1.4))
    for k in range(6):
        mix_at(out, shutter() * rng.uniform(0.5, 1.0), k * rng.uniform(0.11, 0.17))
    return out


# =============================================================================== MUSIQUE (stems synchronisés)
BPM = 84
BEAT = 60 / BPM
BARS = 16
LOOP = BARS * 4 * BEAT


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# Grille : ii-V-I-vi en ré mineur / fa majeur, voicings de jazz
CHORDS = [
    ([50, 57, 60, 64, 65], 38),  # Dm9
    ([55, 59, 62, 65, 69], 43),  # G13
    ([48, 55, 59, 62, 64], 36),  # Cmaj9
    ([45, 52, 55, 60, 61], 45),  # A7(b9)
]


def mus_office_base():
    total = LOOP + 4
    out = np.zeros((n_of(total), 2))
    g = np.random.default_rng(21)
    # piano électrique : accords sur la « et » du 1 et le 3 (comping)
    for bar in range(BARS):
        notes, root = CHORDS[bar % 4]
        for hit, vel in ((0.5, 0.7), (2.0, 0.55), (3.5, 0.45) if bar % 2 else (2.75, 0.4)):
            t0 = (bar * 4 + hit) * BEAT + g.uniform(-0.012, 0.012)
            for i, nte in enumerate(notes[1:]):
                v = fm_epiano(midi(nte + 12), BEAT * 1.6, vel * g.uniform(0.8, 1.0)) * 0.12
                place_st(out, v, t0 + i * 0.006, (i - 2) * 0.25, wrap=True)
        # contrebasse : ligne walking
        walk = [root, root + 7, root + 3 + (bar % 2), root + 5]
        for b, nte in enumerate(walk):
            t0 = (bar * 4 + b) * BEAT
            pl = ks_fast(midi(nte), BEAT * 1.05, 0.9985, 0.25, seed=bar * 4 + b)
            pl = lp(pl, 900) * ar(BEAT * 1.05, 0.004, 0.08) * 0.5
            place_st(out, pl, t0, -0.1, wrap=True)
    # balais sur caisse claire + ride
    for beat in range(BARS * 4):
        t0 = beat * BEAT
        swirl = bp(white(BEAT), 1500, 8000) * np.sin(np.linspace(0, np.pi, n_of(BEAT))) * 0.03
        place_st(out, swirl, t0, 0.3, wrap=True)
        ride = hp(modal([3100, 4700, 6900, 8800], [0.4, 0.3, 0.2, 0.15], [1, 0.8, 0.6, 0.4], 0.8, 0.0005), 2500) * 0.04
        place_st(out, ride, t0, 0.45, wrap=True)
        if beat % 2 == 1:  # swing : croche de la ride
            place_st(out, ride * 0.6, t0 + BEAT * 0.66, 0.45, wrap=True)
        if beat % 4 in (1, 3):
            slap = bp(white(0.15), 1200, 7000) * expdec(0.15, 0.03) * 0.08
            place_st(out, slap, t0, 0.15, wrap=True)
    wet = reverb(out, 2.0, 0.5, 0.5, seed=5)
    return wrap_tail(wet, LOOP)


def mus_tension_bass():
    total = LOOP + 3
    out = np.zeros((n_of(total), 2))
    for bar in range(BARS):
        _, root = CHORDS[bar % 4]
        for e in range(8):
            t0 = (bar * 4 + e * 0.5) * BEAT
            f = midi(root - 12 if e % 4 else root - 12)
            tq = tt(BEAT * 0.45)
            saw = sum(np.sin(2 * np.pi * f * h * tq) / h for h in range(1, 12))
            note = lp(saw, 180 + 600 * np.exp(-tq / 0.05)[0]) * np.exp(-tq / 0.12) * (1 if e % 2 == 0 else 0.6)
            sub = np.sin(2 * np.pi * f * tq) * np.exp(-tq / 0.2)
            place_st(out, (note * 0.4 + sub * 0.5) * 0.6, t0, 0.0, wrap=True)
    drone = lp(np.sin(2 * np.pi * midi(38) * tt(total)) + 0.5 * np.sin(2 * np.pi * midi(45) * 1.003 * tt(total)), 500) * 0.06
    out += stereo(drone)
    return wrap_tail(reverb(out, 1.5, 0.3, 0.6), LOOP)


def mus_tension_drums():
    total = LOOP + 3
    out = np.zeros((n_of(total), 2))
    g = np.random.default_rng(22)
    for beat in range(BARS * 4):
        t0 = beat * BEAT
        if beat % 4 in (0, 2) or (beat % 8 == 7):
            t = tt(0.6)
            tom = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t / 0.2) + 48) / SR) * np.exp(-t / 0.3)
            tom += lp(white(0.6) * np.exp(-t / 0.02), 1500) * 0.3
            place_st(out, tom * 0.5, t0, g.uniform(-0.2, 0.2), wrap=True)
        for s in range(4):
            hat = hp(white(0.05) * expdec(0.05, 0.012), 7000) * (0.05 if s % 2 else 0.08)
            place_st(out, hat, t0 + s * BEAT / 4, 0.35, wrap=True)
    return wrap_tail(reverb(out, 1.8, 0.35, 0.5), LOOP)


def mus_verdict_sting():
    sec = 5.0
    t = tt(sec)
    chord = [38, 45, 50, 53, 57, 62]
    brass = np.zeros(n_of(sec))
    for nte in chord:
        f = midi(nte)
        saw = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.002 * rng.uniform(-1, 1))) / h for h in range(1, 14))
        brass += saw
    brass = lp(brass, 2500) * (1 - np.exp(-t / 0.08)) * np.exp(-t / 1.8) * 0.15
    timp = np.sin(2 * np.pi * np.cumsum(np.full(n_of(sec), midi(38)) * (1 + 0.1 * np.exp(-t / 0.05))) / SR) * np.exp(-t / 0.9)
    timp += lp(white(sec) * np.exp(-t / 0.05), 800) * 0.4
    cym = hp(white(sec), 4000) * np.exp(-t / 1.5) * 0.15
    x = brass + timp * 0.5 + cym
    return reverb(x, 2.8, 0.55, 0.4)


def mus_promotion():
    sec = 6.0
    out = np.zeros((n_of(sec), 2))
    motif = [(65, 0.0), (69, 0.25), (72, 0.5), (77, 0.75), (76, 1.5), (72, 1.75), (77, 2.25)]
    for nte, at in motif:
        place_st(out, fm_epiano(midi(nte), 2.0, 0.8) * 0.3 + bell(midi(nte + 12), 2.0) * 0.08, at * 1.2, 0.1, wrap=False)
    for nte in (53, 57, 60, 64):
        place_st(out, fm_epiano(midi(nte), 4.5, 0.6) * 0.15, 0.0, -0.2, wrap=False)
        place_st(out, fm_epiano(midi(nte + 2), 3.5, 0.6) * 0.15, 2.7, 0.2, wrap=False)
    return reverb(out, 2.4, 0.5, 0.4)


# =============================================================================== catalogue
SOUNDS = {
    # ambiances
    "amb-courtroom": amb_courtroom,
    "amb-office-night": amb_office_night,
    "amb-office-day": amb_office_day,
    "amb-openspace": amb_openspace,
    "amb-conversation": amb_conversation,
    "amb-lobby-marble": amb_lobby_marble,
    "amb-elevator": amb_elevator,
    "amb-rain-taxi": amb_rain_taxi,
    "amb-street-rain": amb_street_rain,
    "amb-courthouse-steps": amb_courthouse_steps,
    "amb-conference": amb_conference,
    "amb-printer": amb_printer,
    "amb-taxi-radio": amb_taxi_radio,
    "amb-lobby-radio": amb_lobby_radio,
    "amb-computer-fan": amb_computer_fan,
    # bruitages
    "sfx-gavel": sfx_gavel,
    "sfx-objection": sfx_objection,
    "sfx-reveal": sfx_reveal,
    "sfx-string-tense": sfx_string_tense,
    "sfx-crowd-murmur": sfx_crowd_murmur,
    "sfx-crowd-gasp": sfx_crowd_gasp,
    "sfx-heartbeat": sfx_heartbeat,
    "sfx-clock-tick": sfx_clock_tick,
    "sfx-pin": sfx_pin,
    "sfx-paper-slide": sfx_paper_slide,
    "sfx-paper-flip": sfx_paper_flip,
    "sfx-highlighter": sfx_highlighter,
    "sfx-stamp": sfx_stamp,
    "sfx-typewriter-soft": sfx_typewriter_soft,
    "sfx-briefcase-open": sfx_briefcase_open,
    "sfx-coins-counter": sfx_coins_counter,
    "sfx-footsteps": sfx_footsteps,
    "sfx-camera-flash": sfx_camera_flash,
    "sfx-car-door": sfx_car_door,
    "sfx-badge-beep": sfx_badge_beep,
    "sfx-badge-print": sfx_badge_print,
    "sfx-turnstile": sfx_turnstile,
    "sfx-elevator-ding": sfx_elevator_ding,
    "sfx-elevator-doors": sfx_elevator_doors,
    "sfx-door-revolving": sfx_door_revolving,
    "sfx-phone-vibrate": sfx_phone_vibrate,
    "sfx-desk-phone-ring": lambda: desk_phone_ring(1),
    "sfx-desk-knock": sfx_desk_knock,
    "sfx-ball-bounce": sfx_ball_bounce,
    "sfx-notification": sfx_notification,
    "sfx-ui-hover": sfx_ui_hover,
    "sfx-screw": sfx_screw,
    "sfx-boxes": sfx_boxes,
    "sfx-whoosh": sfx_whoosh,
    "sfx-shutter-burst": sfx_shutter_burst,
    # musique
    "mus-office-base": mus_office_base,
    "mus-tension-bass": mus_tension_bass,
    "mus-tension-drums": mus_tension_drums,
    "mus-verdict-sting": mus_verdict_sting,
    "mus-promotion": mus_promotion,
}

# Crête de normalisation : les sons continus et denses sont baissés (même intensité perçue que les autres).
PEAKS = {
    "sfx-ui-hover": 0.5,
    "sfx-badge-beep": 0.3,
    "sfx-desk-phone-ring": 0.3,
    "sfx-phone-vibrate": 0.45,
    "sfx-badge-print": 0.35,
    "sfx-highlighter": 0.45,
    "sfx-heartbeat": 0.7,
    "amb-rain-taxi": 0.55,
    "amb-taxi-radio": 0.45,
    "amb-computer-fan": 0.55,
    "mus-tension-bass": 0.6,
}
QUALITY = {k: (0.45 if k.startswith("amb-") else 0.3 if k.startswith("mus-") else 0.4) for k in SOUNDS}

if __name__ == "__main__":
    wanted = sys.argv[1:]
    print("Sons →", OUT)
    for name, fn in SOUNDS.items():
        if wanted and not any(w in name for w in wanted):
            continue
        save(name, fn(), PEAKS.get(name, 0.89), QUALITY[name])
