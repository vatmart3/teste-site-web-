/**
 * Shader de plate 2,5D.
 *
 * 1. Couverture écran (object-fit: cover + overscan + panoramique + roulis).
 * 2. Pluie sur la vitre (gouttes perlées + gouttes qui ruissellent) : réfraction de l'image derrière.
 * 3. Parallaxe par ray-marching dans la carte de profondeur (gère les occultations proprement).
 * 4. Profondeur de champ calculée depuis la carte de profondeur (disque de Vogel + LOD de mipmap).
 * 5. Rayons de lumière (god rays), scintillement néon, fondu de profondeur pour les transitions.
 *
 * La fonction proj() est la même que project() de projection.ts : garder les deux synchronisées.
 */

export const plateVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const common = /* glsl */ `
uniform vec2 uScale;
uniform vec2 uPan;
uniform float uRoll;
uniform float uViewAspect;
uniform vec2 uOffset;
uniform float uPivot;
uniform float uDolly;
uniform vec2 uDollyCenter;
uniform float uFocus;
uniform float uAperture;
uniform float uOpacity;
uniform float uReveal;
uniform float uExposure;
uniform float uTime;
uniform float uLift;
uniform vec4 uChar;
uniform vec3 uCharMotion;
uniform float uRevealMode;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec3 hash31(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec2 rotateScreen(vec2 s) {
  if (uRoll == 0.0) return s;
  float c = cos(uRoll), sn = sin(uRoll);
  vec2 d = vec2((s.x - 0.5) * uViewAspect, s.y - 0.5);
  return vec2((d.x * c - d.y * sn) / uViewAspect + 0.5, d.x * sn + d.y * c + 0.5);
}

vec2 screenToBase(vec2 s) {
  vec2 r = rotateScreen(s);
  return (r - 0.5) * uScale + 0.5 + uPan;
}

vec2 proj(vec2 base, float layer) {
  float s = 1.0 + uDolly * (0.35 + 0.65 * layer);
  vec2 uv = uDollyCenter + (base - uDollyCenter) / s + uOffset * (layer - uPivot);
  // Ascenseur : quand la cabine monte, les plans lointains « tombent » (le proche reste fixe).
  uv.y += uLift * (1.0 - layer);
  // Personnage « vivant » : respiration et micro-mouvements de tête, limités aux pixels
  // situés à la profondeur du personnage et autour de sa position (marche aussi sur une photo fixe).
  if (uChar.w > 0.0) {
    float wd = exp(-pow((layer - uChar.z) / 0.14, 2.0));
    vec2 dv = (base - uChar.xy) * vec2(uViewAspect, 1.0);
    float wr = exp(-dot(dv, dv) / (uChar.w * uChar.w));
    float w = wd * wr;
    float torsoBase = uChar.y - uChar.w;
    uv.y -= uCharMotion.x * (base.y - torsoBase) * w;
    float head = smoothstep(uChar.y - uChar.w * 0.1, uChar.y + uChar.w * 0.6, base.y);
    uv -= uCharMotion.yz * w * head;
  }
  return uv;
}

// Carré de Vogel (répartition uniforme sur un disque).
vec2 vogel(int i, int n, float phi) {
  float r = sqrt((float(i) + 0.5) / float(n));
  float theta = float(i) * 2.39996323 + phi;
  return r * vec2(cos(theta), sin(theta));
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

float revealMask(float depth, vec2 s) {
  if (uReveal >= 1.0) return 1.0;
  if (uRevealMode > 0.5) {
    // Portes d'ascenseur : l'image s'ouvre depuis le centre.
    return smoothstep(0.0, 0.015, uReveal * 0.53 - abs(s.x - 0.5));
  }
  // Les plans proches apparaissent en premier, avec une frange organique (bruit lissé, type encre).
  vec2 q = s * vec2(uViewAspect, 1.0);
  float n = (vnoise(q * 6.0) * 0.65 + vnoise(q * 17.0) * 0.35) * 0.18;
  float th = (1.0 - depth) * 0.85 + n;
  return smoothstep(th, th + 0.15, uReveal * 1.12);
}
`;

export const plateFragment = /* glsl */ `
precision highp float;
uniform sampler2D uColor;
uniform sampler2D uColorB;
uniform float uMix;
uniform vec4 uWiper;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform float uMaxLod;
uniform float uRain;
uniform float uFog;
uniform float uFlicker;
uniform vec2 uShaftPos;
uniform float uShaft;
uniform vec3 uTint;
${common}

// ---------------------------------------------------------------- Pluie sur la vitre
// Renvoie (normale.xy, masque). Coordonnées écran corrigées du ratio.
vec3 beads(vec2 p, float t) {
  vec2 g = p * vec2(34.0, 34.0);
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec3 h = hash31(id.x * 71.3 + id.y * 17.9);
  vec2 c = (h.xy - 0.5) * 0.6;
  float life = fract(t * 0.07 + h.z * 13.0);
  float r = (0.08 + 0.18 * h.z) * smoothstep(0.0, 0.08, life) * smoothstep(1.0, 0.7, life);
  vec2 d = f - c;
  float m = smoothstep(r, r * 0.55, length(d)) * step(0.6, h.x);
  return vec3(d / max(r, 1e-3) * m, m);
}

vec3 runners(vec2 p, float t) {
  vec2 cell = vec2(0.11, 0.33);
  vec2 g = p / cell;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec3 h = hash31(id.x * 13.1 + id.y * 91.7);
  if (h.z < 0.35) return vec3(0.0);
  float speed = 0.12 + 0.25 * h.x;
  float ph = fract(t * speed + h.y);
  // Descente saccadée (stick–slip) : la goutte accroche puis glisse.
  float y = 0.45 - (ph + sin(ph * 6.2831 * 2.0) * 0.04) * 0.9;
  float x = (h.x - 0.5) * 0.5 + sin(y * 12.0 + h.y * 6.0) * 0.04;
  vec2 d = (f - vec2(x, y)) * vec2(cell.x / cell.y, 1.0) * vec2(1.0, 1.25);
  float r = 0.05 + 0.03 * h.y;
  float m = smoothstep(r, r * 0.5, length(d));
  vec3 res = vec3(d / r * m, m);
  // Traînée de gouttelettes au-dessus.
  float above = f.y - y;
  if (above > 0.0 && above < 0.6) {
    float fy = fract(above * 14.0) - 0.5;
    vec2 td = vec2((f.x - x) * cell.x / cell.y, fy / 14.0 * 1.0);
    float tr = 0.012 * (1.0 - above / 0.6);
    float tm = smoothstep(tr, tr * 0.4, length(td)) * step(0.1, above);
    res += vec3(td / max(tr, 1e-3) * tm * 0.6, tm);
  }
  return res;
}

// ---------------------------------------------------------------- Parallaxe (ray-march)
float depthAt(vec2 uv) { return textureLod(uDepth, uv, 0.0).r; }

vec3 marchSurface(vec2 base) {
  const int N = MARCH_STEPS;
  float stepv = 1.0 / float(N);
  float layer = 1.0;
  vec2 uv = proj(base, layer);
  float d = depthAt(uv);
  vec2 prevUv = uv;
  float prevLayer = layer;
  float prevDiff = d - layer;
  for (int i = 0; i < N; i++) {
    if (d >= layer) break;
    prevUv = uv;
    prevLayer = layer;
    prevDiff = d - layer;
    layer -= stepv;
    uv = proj(base, layer);
    d = depthAt(uv);
  }
  float diff = d - layer;
  float w = clamp(diff / (diff - prevDiff + 1e-5), 0.0, 1.0);
  return vec3(mix(uv, prevUv, w), mix(layer, prevLayer, w));
}

vec3 sampleBlurTex(sampler2D tex, vec2 uv, float radius) {
  if (radius < 0.0006) return texture(tex, uv).rgb;
  float lod = clamp(log2(radius / max(uTexel.x, 1e-6)) - 1.5, 0.0, uMaxLod);
  vec3 acc = vec3(0.0);
  float phi = hash21(gl_FragCoord.xy) * 6.2831;
  const int TAPS = DOF_TAPS;
  for (int i = 0; i < TAPS; i++) {
    vec2 o = vogel(i, TAPS, phi) * radius * vec2(1.0, uTexel.y / uTexel.x);
    acc += textureLod(tex, uv + o, lod).rgb;
  }
  return acc / float(TAPS);
}

// Fondu enchaîné entre deux sources (états d'un personnage : idle → talk…).
vec3 sampleBlur(vec2 uv, float radius) {
  vec3 a = sampleBlurTex(uColor, uv, radius);
  if (uMix <= 0.0) return a;
  return mix(a, sampleBlurTex(uColorB, uv, radius), uMix);
}

// ---------------------------------------------------------------- Essuie-glaces
// uWiper = (actif, période en s, amplitude en rad, longueur du balai en hauteur d'écran).
// Renvoie (temps écoulé depuis le dernier passage du balai, masque du balai).
vec2 wiper(vec2 ps, vec2 pivot, float t) {
  float T = uWiper.y;
  float A = uWiper.z;
  float theta0 = 0.12;
  vec2 d = ps - pivot;
  float r = length(d);
  float phi = atan(d.y, d.x);
  // Le balai part de la droite (angle 0.12) et balaie vers la gauche puis revient.
  float u = clamp((phi - theta0) / A, 0.0, 1.0);
  float t1 = T / 6.2831 * acos(1.0 - 2.0 * u);
  float t2 = T - t1;
  float tm = mod(t, T);
  float since = tm >= t2 ? tm - t2 : (tm >= t1 ? tm - t1 : tm + (T - t2));
  float inside = step(r, uWiper.w) * step(0.12, r);
  float theta = theta0 + A * (0.5 - 0.5 * cos(6.2831 * tm / T));
  vec2 dir = vec2(cos(theta), sin(theta));
  float perp = abs(d.x * dir.y - d.y * dir.x);
  float along = dot(d, dir);
  float blade = (1.0 - smoothstep(0.004, 0.009, perp)) * step(0.1, along) * step(along, uWiper.w);
  return vec2(mix(99.0, since, inside), blade);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  vec2 s = vUv;
  vec2 ps = vec2(s.x * uViewAspect, s.y);

  // Pluie : les gouttes réfractent (et inversent) l'image derrière, la buée floute le reste.
  float dropMask = 0.0;
  vec2 dropN = vec2(0.0);
  float wiperBlade = 0.0;
  if (uRain > 0.0) {
    vec3 b = beads(ps, uTime);
    vec3 r1 = runners(ps, uTime);
    vec3 r2 = runners(ps * 1.37 + 3.1, uTime * 0.9);
    vec3 drops = b * 0.8 + r1 + r2;
    float clean = 1.0;
    float blade = 0.0;
    if (uWiper.x > 0.0) {
      for (int k = 0; k < 2; k++) {
        vec2 pivot = k == 0 ? vec2(0.28 * uViewAspect, -0.08) : vec2(0.72 * uViewAspect, -0.08);
        vec2 w = wiper(ps, pivot, uTime + float(k) * 0.08);
        clean = min(clean, smoothstep(0.0, 2.2, w.x));
        blade = max(blade, w.y);
      }
    }
    drops.xy *= clean;
    drops.z *= clean;
    wiperBlade = blade;
    dropMask = clamp(drops.z, 0.0, 1.0) * uRain;
    dropN = drops.xy;
    // Une goutte est une petite lentille : elle montre l'image derrière, inversée et nette.
    s -= drops.xy * 0.045 * uRain;
  }

  vec2 base = screenToBase(s);
  vec3 surf = marchSurface(base);
  vec2 uv = surf.xy;
  float depth = surf.z;

  float coc = abs(depth - uFocus) * uAperture * 0.02;
  coc += uFog * (1.0 - dropMask) * 0.006 * (uWiper.x > 0.0 ? 0.6 : 1.0);
  coc *= 1.0 - dropMask * 0.85;
  vec3 col = sampleBlur(uv, coc);

  // Rayons de lumière : accumulation radiale des zones claires vers la source.
  if (uShaft > 0.0) {
    vec2 dir = (s - uShaftPos);
    float acc = 0.0;
    const int SH = 14;
    float jitter = hash21(gl_FragCoord.xy + uTime);
    for (int i = 0; i < SH; i++) {
      float t = (float(i) + jitter) / float(SH);
      vec2 q = screenToBase(s - dir * t * 0.75);
      vec3 c = textureLod(uColor, q, 3.0).rgb;
      acc += max(luma(c) - 0.55, 0.0) * (1.0 - t);
    }
    col += vec3(1.0, 0.86, 0.66) * acc / float(SH) * uShaft * 1.6;
  }

  // Gouttes : bord sombre (réfraction totale) + petit reflet spéculaire en haut.
  float edge = smoothstep(0.55, 1.0, length(dropN));
  col *= 1.0 - edge * dropMask * 0.55;
  float spec = pow(max(dot(normalize(dropN + 1e-4), vec2(-0.35, 0.94)), 0.0), 12.0) * smoothstep(0.35, 0.8, length(dropN));
  col += spec * dropMask * vec3(0.5, 0.55, 0.6);

  col = mix(col, vec3(0.008), wiperBlade * 0.95);

  // Néon qui grésille.
  if (uFlicker > 0.0) {
    float f = step(0.93, hash21(vec2(floor(uTime * 18.0), 3.0))) * hash21(vec2(floor(uTime * 40.0), 7.0));
    col *= 1.0 - f * uFlicker;
  }

  col *= uTint * uExposure;
  float a = uOpacity * revealMask(depth, vUv);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;

/** Calque détouré (PNG) à profondeur constante, par-dessus la plate. */
export const layerFragment = /* glsl */ `
precision highp float;
uniform sampler2D uLayer;
uniform float uDepthConst;
uniform float uLocked;
uniform vec2 uLockScale;
uniform float uMaxLod;
uniform vec3 uTint;
${common}

void main() {
  vec2 uv;
  if (uLocked > 0.5) {
    // Calque attaché à la caméra (cabine d'ascenseur, pare-brise) : ne suit ni le panoramique ni la montée.
    uv = (rotateScreen(vUv) - 0.5) * uLockScale + 0.5 + uOffset * (uDepthConst - uPivot) * 0.5;
  } else {
    uv = proj(screenToBase(vUv), uDepthConst);
  }
  float coc = abs(uDepthConst - uFocus) * uAperture;
  float lod = clamp(coc * 6.0, 0.0, uMaxLod);
  vec4 c = textureLod(uLayer, uv, lod);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) c.a = 0.0;
  float a = c.a * uOpacity * revealMask(uDepthConst, vUv);
  gl_FragColor = vec4(c.rgb * uTint * uExposure, a);
  #include <colorspace_fragment>
}
`;
