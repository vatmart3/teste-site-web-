/**
 * Sons de secours synthétisés : tant que les fichiers de l'annexe C ne sont pas dans /public/audio,
 * chaque son nommé a un équivalent procédural (bruit filtré, sinus, enveloppes) pour que le jeu
 * soit déjà sonore. Tout est généré échantillon par échantillon dans des AudioBuffer.
 */

type Gen = (ctx: BaseAudioContext) => AudioBuffer;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(ctx: BaseAudioContext, seconds: number, channels: number, fill: (ch: number, data: Float32Array, sr: number) => void) {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(channels, Math.max(1, Math.floor(seconds * sr)), sr);
  for (let c = 0; c < channels; c++) fill(c, buf.getChannelData(c), sr);
  return buf;
}

/** Fondu aux extrémités d'une boucle pour qu'elle raccorde sans clic. */
function loopFade(d: Float32Array, sr: number, sec = 0.05) {
  const n = Math.min(d.length / 2, Math.floor(sr * sec));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    d[i]! *= g;
    d[d.length - 1 - i]! *= g;
  }
}

/** Bruit « rose » approximé (filtre de Paul Kellet) + passe-bas simple. */
function pinkNoise(d: Float32Array, r: () => number, lp = 1, gain = 0.2) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, y = 0;
  for (let i = 0; i < d.length; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const p = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    y += (p * 0.11 - y) * lp;
    d[i] = y * gain;
  }
}

function brown(d: Float32Array, r: () => number, gain = 1) {
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (r() * 2 - 1)) / 1.02;
    d[i] = last * 3.5 * gain;
  }
}

function addClicks(d: Float32Array, sr: number, r: () => number, perSec: number, amp: number, decayMs: number, tone = 0) {
  const n = Math.floor((d.length / sr) * perSec);
  const len = Math.floor((decayMs / 1000) * sr);
  for (let k = 0; k < n; k++) {
    const at = Math.floor(r() * (d.length - len));
    const a = amp * (0.4 + r() * 0.6);
    for (let i = 0; i < len; i++) {
      const env = Math.exp((-6 * i) / len);
      const s = tone ? Math.sin((2 * Math.PI * tone * i) / sr) : r() * 2 - 1;
      d[at + i]! += s * env * a;
    }
  }
}

const tau = Math.PI * 2;

const ambience: Record<string, Gen> = {
  "amb-conversation": (ctx) =>
    make(ctx, 9, 1, (_c, d, sr) => {
      // Deux voix étouffées qui alternent (bruit formantique modulé en syllabes).
      const m = new Float32Array(d.length);
      pinkNoise(m, rng(52), 0.18, 1.2);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const who = Math.sin(tau * 0.18 * t) > 0 ? 1 : 0;
        const syl = Math.max(0, Math.sin(tau * (who ? 4.1 : 3.3) * t + Math.sin(tau * 0.7 * t) * 2)) ** 1.5;
        const pause = Math.sin(tau * 0.43 * t + 1) > -0.6 ? 1 : 0;
        d[i] = m[i]! * syl * pause * (who ? 0.9 : 0.7) + Math.sin(tau * (who ? 140 : 210) * t) * syl * pause * 0.02;
      }
      loopFade(d, sr);
    }),
  "amb-office-day": (ctx) =>
    make(ctx, 8, 2, (c, d, sr) => {
      const r = rng(64 + c);
      pinkNoise(d, r, 0.12, 0.25); // climatisation
      const city = new Float32Array(d.length);
      brown(city, rng(65 + c), 0.25); // ville très loin, derrière le double vitrage
      for (let i = 0; i < d.length; i++) d[i]! += city[i]!;
      loopFade(d, sr);
    }),
  "amb-rain-taxi": (ctx) =>
    make(ctx, 8, 2, (c, d, sr) => {
      const r = rng(10 + c);
      pinkNoise(d, r, 0.55, 0.5);
      addClicks(d, sr, r, 60, 0.06, 6); // gouttes sur la carrosserie
      const m = new Float32Array(d.length);
      brown(m, rng(3), 0.6); // moteur au ralenti
      for (let i = 0; i < d.length; i++) d[i]! += m[i]! * 0.5 + Math.sin((tau * 42 * i) / sr) * 0.015;
      loopFade(d, sr);
    }),
  "amb-street-rain": (ctx) =>
    make(ctx, 8, 2, (c, d, sr) => {
      const r = rng(20 + c);
      pinkNoise(d, r, 0.8, 0.6);
      addClicks(d, sr, r, 25, 0.04, 12);
      // Passage d'une voiture sur la chaussée mouillée.
      const start = Math.floor(d.length * (c ? 0.35 : 0.3));
      const len = Math.floor(sr * 2.2);
      const n = rng(99);
      for (let i = 0; i < len && start + i < d.length; i++) {
        const t = i / len;
        d[start + i]! += (n() * 2 - 1) * Math.sin(Math.PI * t) ** 2 * 0.12;
      }
      loopFade(d, sr);
    }),
  "amb-lobby-marble": (ctx) =>
    make(ctx, 10, 2, (c, d, sr) => {
      const r = rng(30 + c);
      brown(d, r, 0.25);
      addClicks(d, sr, r, 1.4, 0.12, 25, 900); // talons sur le marbre
      loopFade(d, sr);
    }),
  "amb-elevator": (ctx) =>
    make(ctx, 6, 2, (c, d, sr) => {
      const r = rng(40 + c);
      brown(d, r, 0.3);
      for (let i = 0; i < d.length; i++) d[i]! += Math.sin((tau * 110 * i) / sr) * 0.02 + Math.sin((tau * 1760 * i) / sr) * 0.003;
      loopFade(d, sr);
    }),
  "amb-openspace": (ctx) =>
    make(ctx, 10, 2, (c, d, sr) => {
      const r = rng(50 + c);
      brown(d, r, 0.35);
      addClicks(d, sr, r, 14, 0.05, 8); // claviers
      // Murmure de conversations : bruit filtré modulé en syllabes.
      const m = new Float32Array(d.length);
      pinkNoise(m, rng(51 + c), 0.3, 0.9);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const syll = Math.max(0, Math.sin(tau * 3.1 * t + Math.sin(tau * 0.4 * t) * 3)) ** 2;
        d[i]! += m[i]! * syll * 0.25;
      }
      loopFade(d, sr);
    }),
  "amb-office-night": (ctx) =>
    make(ctx, 6, 2, (c, d, sr) => {
      const r = rng(60 + c);
      pinkNoise(d, r, 0.15, 0.35); // ventilation
      for (let i = 0; i < d.length; i++) d[i]! += Math.sin((tau * 120 * i) / sr) * 0.008; // néon
      loopFade(d, sr);
    }),
  "amb-taxi-radio": (ctx) =>
    make(ctx, 8, 1, (_c, d, sr) => {
      // Radio lointaine : accords jazzy très filtrés (téléphone).
      const chords = [[220, 277, 330, 415], [196, 247, 294, 370], [175, 220, 262, 330], [196, 247, 311, 392]];
      const r = rng(70);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const ch = chords[Math.floor(t / 2) % chords.length]!;
        let s = 0;
        for (const f of ch) s += Math.sin(tau * f * t) * 0.05;
        d[i] = s * (0.6 + 0.4 * Math.sin(tau * 5 * t)) + (r() * 2 - 1) * 0.01;
      }
      loopFade(d, sr);
    }),
  "amb-printer": (ctx) =>
    make(ctx, 5, 1, (_c, d, sr) => {
      const r = rng(80);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const on = t > 1 && t < 3.2 ? 1 : 0;
        d[i] = on * ((r() * 2 - 1) * 0.08 * (0.5 + 0.5 * Math.sin(tau * 18 * t)) + Math.sin(tau * 95 * t) * 0.05);
      }
      loopFade(d, sr);
    }),
  "amb-lobby-radio": (ctx) =>
    make(ctx, 7, 1, (_c, d, sr) => {
      const r = rng(81);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const burst = t > 2 && t < 3.1 ? 1 : 0;
        d[i] = burst * (r() * 2 - 1) * 0.06 * (0.5 + 0.5 * Math.sin(tau * 6 * t));
      }
    }),
};

const sfx: Record<string, Gen> = {
  "sfx-badge-print": (ctx) =>
    make(ctx, 2.2, 1, (_c, d, sr) => {
      const r = rng(88);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const motor = Math.sin(tau * 180 * t + Math.sin(tau * 31 * t) * 2) * 0.08;
        const steps = (r() * 2 - 1) * 0.1 * (0.5 + 0.5 * Math.sign(Math.sin(tau * 24 * t)));
        d[i] = (motor + steps) * Math.min(1, t * 8) * Math.min(1, (2.2 - t) * 6);
      }
    }),
  "sfx-desk-knock": (ctx) =>
    make(ctx, 0.25, 1, (_c, d, sr) => {
      const r = rng(85);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.sin(tau * 260 * t) * 0.5 + Math.sin(tau * 590 * t) * 0.25 + (r() * 2 - 1) * 0.25 * Math.exp(-t * 200)) * Math.exp(-t * 28);
      }
    }),
  "sfx-ball-bounce": (ctx) =>
    make(ctx, 0.18, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(tau * (140 - t * 200) * t) * Math.exp(-t * 30) * 0.6;
      }
    }),
  "sfx-notification": (ctx) =>
    make(ctx, 0.5, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const f = t < 0.09 ? 988 : 1319;
        d[i] = Math.sin(tau * f * t) * 0.14 * Math.exp(-(t < 0.09 ? t : t - 0.09) * 10);
      }
    }),
  "sfx-briefcase-open": (ctx) =>
    make(ctx, 0.9, 1, (_c, d, sr) => {
      const r = rng(84);
      for (const at of [0.02, 0.12]) {
        const s0 = Math.floor(at * sr);
        for (let i = 0; i < sr * 0.05 && s0 + i < d.length; i++) {
          const t = i / sr;
          d[s0 + i] = ((r() * 2 - 1) * 0.5 + Math.sin(tau * 1800 * t) * 0.4) * Math.exp(-t * 90);
        }
      }
      for (let i = Math.floor(0.25 * sr); i < d.length; i++) {
        const t = i / sr - 0.25;
        d[i]! += (r() * 2 - 1) * 0.05 * Math.sin(Math.PI * Math.min(1, t / 0.6));
      }
    }),
  "sfx-screw": (ctx) =>
    make(ctx, 0.6, 1, (_c, d, sr) => {
      const r = rng(83);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const ratchet = Math.sin(tau * 22 * t) > 0.6 ? 1 : 0;
        d[i] = (r() * 2 - 1) * 0.18 * ratchet * Math.exp(-t * 2) + Math.sin(tau * 3200 * t) * 0.02 * ratchet;
      }
    }),
  "sfx-boxes": (ctx) =>
    make(ctx, 1.4, 1, (_c, d, sr) => {
      const r = rng(82);
      for (const at of [0.05, 0.55, 0.95]) {
        const s0 = Math.floor(at * sr);
        for (let i = 0; i < sr * 0.2 && s0 + i < d.length; i++) {
          const t = i / sr;
          d[s0 + i] = (Math.sin(tau * 90 * t) * 0.6 + (r() * 2 - 1) * 0.3) * Math.exp(-t * 18);
        }
      }
    }),
  "amb-computer-fan": (ctx) =>
    make(ctx, 4, 2, (c, d, sr) => {
      const r = rng(81 + c);
      pinkNoise(d, r, 0.25, 0.3);
      for (let i = 0; i < d.length; i++) d[i]! += Math.sin((tau * 180 * i) / sr) * 0.006;
      loopFade(d, sr);
    }),
  "sfx-footsteps": (ctx) =>
    make(ctx, 1.6, 1, (_c, d, sr) => {
      const r = rng(87);
      for (const at of [0.05, 0.5, 0.95, 1.4]) {
        const s0 = Math.floor(at * sr);
        for (let i = 0; i < sr * 0.12 && s0 + i < d.length; i++) {
          const t = i / sr;
          d[s0 + i] = ((r() * 2 - 1) * 0.25 * Math.exp(-t * 60) + Math.sin(tau * 110 * t) * 0.3 * Math.exp(-t * 35)) * (at === 0.95 ? 0.8 : 1);
        }
      }
    }),
  "sfx-camera-flash": (ctx) =>
    make(ctx, 0.9, 1, (_c, d, sr) => {
      const r = rng(86);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const shutter = t < 0.03 ? (r() * 2 - 1) * 0.4 : 0;
        const whine = t > 0.05 ? Math.sin(tau * (2000 + t * 4000) * t) * 0.02 * Math.exp(-(t - 0.05) * 3) : 0;
        d[i] = shutter + whine;
      }
    }),
  "sfx-elevator-ding": (ctx) =>
    make(ctx, 2.5, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const e = Math.exp(-t * 2.2);
        d[i] = (Math.sin(tau * 1318.5 * t) * 0.5 + Math.sin(tau * 2637 * t) * 0.15 + Math.sin(tau * 3950 * t) * 0.05) * e * 0.5;
      }
    }),
  "sfx-badge-beep": (ctx) =>
    make(ctx, 0.25, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const on = t < 0.09 || (t > 0.13 && t < 0.22) ? 1 : 0;
        d[i] = Math.sign(Math.sin(tau * 1850 * t)) * 0.12 * on;
      }
    }),
  "sfx-phone-vibrate": (ctx) =>
    make(ctx, 1.4, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const on = t % 0.7 < 0.4 ? 1 : 0;
        d[i] = Math.sin(tau * 150 * t + Math.sin(tau * 23 * t)) * 0.4 * on * Math.min(1, (t % 0.7) * 40);
      }
    }),
  "sfx-desk-phone-ring": (ctx) =>
    make(ctx, 6, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const on = t % 6 < 2 ? 1 : 0;
        const trem = Math.sign(Math.sin(tau * 20 * t)) * 0.5 + 0.5;
        d[i] = (Math.sin(tau * 440 * t) + Math.sin(tau * 480 * t)) * 0.12 * on * trem;
      }
    }),
  "sfx-door-revolving": (ctx) =>
    make(ctx, 1.8, 2, (c, d, sr) => {
      const r = rng(90 + c);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const whoosh = Math.sin(Math.PI * Math.min(1, t / 1.6)) ** 2;
        d[i] = (r() * 2 - 1) * 0.12 * whoosh + Math.sin(tau * 60 * t) * Math.exp(-t * 8) * 0.5;
      }
      for (let i = 1; i < d.length; i++) d[i] = d[i - 1]! * 0.85 + d[i]! * 0.15;
    }),
  "sfx-car-door": (ctx) =>
    make(ctx, 0.9, 2, (c, d, sr) => {
      const r = rng(89 + c);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const latch = t < 0.06 ? (r() * 2 - 1) * 0.5 * Math.exp(-t * 70) : 0;
        d[i] = latch + Math.sin(tau * 70 * t) * Math.exp(-t * 7) * 0.4 * (t > 0.04 ? 1 : 0);
      }
    }),
  "sfx-turnstile": (ctx) =>
    make(ctx, 0.5, 1, (_c, d, sr) => {
      const r = rng(91);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = ((r() * 2 - 1) * 0.4 + Math.sin(tau * 320 * t) * 0.5) * Math.exp(-t * 30) + (t > 0.2 ? Math.sin(tau * 240 * t) * Math.exp(-(t - 0.2) * 25) * 0.4 : 0);
      }
    }),
  "sfx-elevator-doors": (ctx) =>
    make(ctx, 2, 2, (c, d, sr) => {
      const r = rng(92 + c);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (r() * 2 - 1) * 0.08 * Math.sin(Math.PI * Math.min(1, t / 1.8)) + Math.sin(tau * 80 * t) * 0.03;
      }
      for (let i = 1; i < d.length; i++) d[i] = d[i - 1]! * 0.9 + d[i]! * 0.1;
    }),
  "sfx-paper-slide": (ctx) =>
    make(ctx, 0.7, 1, (_c, d, sr) => {
      const r = rng(93);
      let y = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        y += ((r() * 2 - 1) - y) * (0.2 + t);
        d[i] = y * 0.5 * Math.sin(Math.PI * Math.min(1, t / 0.65));
      }
    }),
  "sfx-paper-flip": (ctx) =>
    make(ctx, 0.35, 1, (_c, d, sr) => {
      const r = rng(94);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (r() * 2 - 1) * 0.4 * Math.exp(-t * 14) * (1 + Math.sin(tau * 30 * t));
      }
    }),
  "sfx-stamp": (ctx) =>
    make(ctx, 0.5, 1, (_c, d, sr) => {
      const r = rng(95);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.sin(tau * (90 - t * 80) * t) * 0.9 + (r() * 2 - 1) * 0.3) * Math.exp(-t * 18);
      }
    }),
  "sfx-gavel": (ctx) =>
    make(ctx, 1.2, 1, (_c, d, sr) => {
      const r = rng(96);
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.sin(tau * 180 * t) * 0.7 + Math.sin(tau * 410 * t) * 0.3 + (r() * 2 - 1) * 0.2 * Math.exp(-t * 80)) * Math.exp(-t * 9);
      }
    }),
  "sfx-heartbeat": (ctx) =>
    make(ctx, 1, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const beat = (tt: number) => (tt > 0 ? Math.sin(tau * 55 * tt) * Math.exp(-tt * 22) : 0);
        d[i] = (beat(t) + beat(t - 0.22) * 0.7) * 0.8;
      }
    }),
  "sfx-clock-tick": (ctx) =>
    make(ctx, 0.1, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(tau * 2400 * t) * Math.exp(-t * 90) * 0.3;
      }
    }),
  "sfx-typewriter-soft": (ctx) =>
    make(ctx, 0.05, 1, (_c, d, sr) => {
      const r = rng(97);
      for (let i = 0; i < d.length; i++) d[i] = (r() * 2 - 1) * Math.exp((-i / sr) * 160) * 0.2;
    }),
  "sfx-pin": (ctx) =>
    make(ctx, 0.2, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(tau * 1200 * t) * Math.exp(-t * 60) * 0.4;
      }
    }),
  "sfx-ui-hover": (ctx) =>
    make(ctx, 0.12, 1, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(tau * 2200 * t) * Math.exp(-t * 60) * 0.08;
      }
    }),
};

/** Stems de musique de secours (jazz lounge très simplifié, 12 s, 80 bpm). */
const music: Record<string, Gen> = {
  "mus-office-base": (ctx) =>
    make(ctx, 12, 2, (c, d, sr) => {
      // Accords de type Rhodes : ii–V–I–vi en ré mineur/fa majeur.
      const prog = [
        [146.8, 174.6, 220.0, 261.6],
        [130.8, 164.8, 196.0, 233.1],
        [174.6, 220.0, 261.6, 329.6],
        [146.8, 185.0, 220.0, 293.7],
      ];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const bar = Math.floor(t / 3) % 4;
        const tb = t % 3;
        const env = Math.exp(-tb * 0.9) * 0.8 + 0.2;
        let s = 0;
        for (const f of prog[bar]!) s += Math.sin(tau * f * t + (c ? 0.3 : 0)) * 0.035 + Math.sin(tau * f * 2 * t) * 0.008;
        d[i] = s * env * (0.85 + 0.15 * Math.sin(tau * 4.5 * t + c));
      }
      loopFade(d, sr, 0.02);
    }),
  "mus-tension-bass": (ctx) =>
    make(ctx, 12, 2, (_c, d, sr) => {
      const beat = 60 / 80;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const tb = t % beat;
        const root = [73.4, 65.4, 87.3, 73.4][Math.floor(t / 3) % 4]!;
        d[i] = Math.sin(tau * root * t) * Math.exp(-tb * 3) * 0.3;
      }
      loopFade(d, sr, 0.02);
    }),
  "mus-tension-drums": (ctx) =>
    make(ctx, 12, 2, (c, d, sr) => {
      const r = rng(120 + c);
      const beat = 60 / 80;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const tb = t % beat;
        const half = t % (beat / 2);
        const kick = Math.sin(tau * (60 - tb * 40) * tb) * Math.exp(-tb * 14) * 0.5;
        const hat = (r() * 2 - 1) * Math.exp(-half * 60) * 0.05;
        d[i] = kick + hat;
      }
      loopFade(d, sr, 0.02);
    }),
  "mus-verdict-sting": (ctx) =>
    make(ctx, 3, 2, (_c, d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        let s = 0;
        for (const f of [73.4, 110, 146.8, 174.6, 220]) s += Math.sin(tau * f * t) * 0.07;
        d[i] = s * Math.exp(-t * 1.2);
      }
    }),
};

const generators: Record<string, Gen> = { ...ambience, ...sfx, ...music };

export function hasSynth(name: string): boolean {
  return name in generators;
}

export function synthBuffer(ctx: BaseAudioContext, name: string): AudioBuffer | null {
  const g = generators[name];
  return g ? g(ctx) : null;
}

/** Réponse impulsionnelle synthétique (réverbération) : bruit stéréo à décroissance exponentielle. */
export function impulseResponse(ctx: BaseAudioContext, seconds: number, decay: number, damp: number): AudioBuffer {
  return make(ctx, Math.max(0.05, seconds), 2, (c, d) => {
    const r = rng(500 + c);
    let y = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / d.length;
      y += ((r() * 2 - 1) - y) * (1 - damp * t);
      d[i] = y * Math.pow(1 - t, decay);
    }
  });
}
