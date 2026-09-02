export const paperVertex = /* glsl */ `
uniform float uTime;
uniform float uFold;
varying vec2 vUv;
varying vec3 vNormal;

float ondulation(vec2 p, float t) {
  return 0.046 * sin(p.x * 2.10 + t * 0.55)
       + 0.032 * sin(p.y * 1.55 - t * 0.42)
       + 0.015 * sin((p.x + p.y) * 3.20 + t * 0.90);
}

void main() {
  vUv = uv;
  vec3 pos = position;

  // ondulation très légère : la feuille n'est jamais parfaitement plane
  float e = 0.02;
  float h  = ondulation(pos.xy, uTime);
  float hx = ondulation(pos.xy + vec2(e, 0.0), uTime);
  float hy = ondulation(pos.xy + vec2(0.0, e), uTime);
  pos.z += h;

  vec3 tx = normalize(vec3(e, 0.0, hx - h));
  vec3 ty = normalize(vec3(0.0, e, hy - h));
  vNormal = normalize(cross(tx, ty));

  // pliage : les deux moitiés se referment autour de l'axe vertical
  if (uFold > 0.0) {
    float angle = uFold * 1.35 * sign(pos.x);
    float c = cos(angle);
    float s = sin(angle);
    float x = pos.x;
    pos.x = x * c;
    pos.z += abs(x) * s;
    pos *= 1.0 - uFold * 0.58;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const paperFragment = /* glsl */ `
uniform float uScan;
uniform float uFold;
varying vec2 vUv;
varying vec3 vNormal;

float grain(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // lumière rasante : elle passe presque à plat, donc la moindre ondulation
  // se traduit par une variation de tons. On amplifie l'écart autour de la
  // valeur au repos, sinon le papier lit comme un aplat gris.
  vec3 lumiere = normalize(vec3(-0.90, 0.30, 0.31));
  float lambert = dot(normalize(vNormal), lumiere);
  float repos = 0.31;
  float relief = clamp((lambert - repos) * 3.4, -1.0, 1.0);

  // plancher à 0.88 : le titre en encre reste très au-dessus du contraste AA
  float valeur = 0.986 + relief * 0.072;

  // la lumière vient de la droite : le bord gauche s'éteint doucement
  valeur -= smoothstep(0.5, 0.0, vUv.x) * 0.026;

  // grain du papier
  valeur -= grain(floor(vUv * 900.0)) * 0.022;

  // très faibles réglures, comme un polycopié
  float reglure = smoothstep(0.972, 1.0, abs(sin(vUv.y * 128.0)));
  valeur -= reglure * 0.040;

  valeur = clamp(valeur, 0.888, 1.0);

  // barre de scan de la photocopieuse
  if (uScan >= 0.0) {
    float d = vUv.y - uScan;
    float bande = smoothstep(0.055, 0.0, abs(d));
    float bord = smoothstep(0.010, 0.0, abs(d + 0.030));
    vec3 couleur = vec3(valeur);
    couleur = mix(couleur, vec3(1.0, 0.914, 0.29), bande * 0.72);
    couleur = mix(couleur, vec3(0.05), bord * 0.55);
    gl_FragColor = vec4(couleur, 1.0 - uFold * 0.9);
    return;
  }

  gl_FragColor = vec4(vec3(valeur), 1.0 - uFold * 0.9);
}
`;
