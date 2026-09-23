"use client";
/**
 * Manhattan procédural : des centaines de tours instanciées, fenêtres éclairées calculées dans le shader
 * (grille d'étages en coordonnées monde, allumage aléatoire par fenêtre), rues éclairées au sol, ciel
 * dégradé avec lever de soleil et brume de distance. Utilisé par l'ascenseur, le bureau d'angle, les fenêtres.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface CityLook {
  /** 0 = plein jour, 1 = nuit noire (fenêtres allumées, ciel sombre). */
  night: number;
  /** 0..1 : lueur du soleil levant/couchant à l'horizon. */
  sunGlow: number;
}

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

const windowChunk = /* glsl */ `
  // Fenêtres : grille d'étages (3,8 m) et de travées (2,6 m) sur les faces verticales.
  vec3 cWin = vec3(0.0);
  if (abs(vCityNormal.y) < 0.5) {
    vec3 tang = normalize(vec3(-vCityNormal.z, 0.0, vCityNormal.x));
    float u = dot(vCityPos.xz, tang.xz) / 2.6;
    float v = vCityPos.y / 3.8;
    vec2 cell = floor(vec2(u, v));
    vec2 f = fract(vec2(u, v));
    float frame = step(0.14, f.x) * step(f.x, 0.86) * step(0.2, f.y) * step(f.y, 0.82);
    float h = fract(sin(dot(cell + vCitySeed * 17.0, vec2(12.9898, 78.233))) * 43758.5453);
    // Moins de fenêtres allumées à l'aube qu'en pleine nuit.
    float ratio = uLitRatio * (0.6 + vCitySeed * 0.8) * smoothstep(0.05, 1.0, uNight);
    float lit = step(1.0 - ratio, h);
    // Anti-crénelage : au loin, la grille se fond en sa valeur moyenne (pas de moiré).
    float aa = clamp(1.0 - max(fwidth(u), fwidth(v)) * 1.6, 0.0, 1.0);
    float frameA = mix(0.45, frame, aa);
    float litA = mix(ratio * 0.9, lit, aa);
    vec3 warm = mix(vec3(1.0, 0.74, 0.46), vec3(0.78, 0.86, 1.0), step(0.86, fract(h * 7.3)));
    cWin = warm * litA * frameA * uNight * (0.55 + 0.6 * fract(h * 31.7));
    // Verre : les travées sombres entre les allèges, le ciel s'y reflète (métal lisse).
    diffuseColor.rgb *= mix(1.0, 0.7 + 0.5 * frame, aa);
  }
`;

export function City({
  look,
  seed = 7,
  count = 900,
  inner = 90,
  outer = 1700,
  center = [0, 0, 0] as [number, number, number],
  groundY = -40,
  sunDir = [-0.6, 0.05, -0.8] as [number, number, number],
  vista,
}: {
  look: CityLook;
  seed?: number;
  count?: number;
  inner?: number;
  outer?: number;
  center?: [number, number, number];
  groundY?: number;
  /** Direction du soleil (lueur du ciel à l'horizon). */
  sunDir?: [number, number, number];
  /** Percée dégagée depuis le centre (direction xz, demi-angle en radians, portée en m) : la vue reste ouverte. */
  vista?: { dir: [number, number]; angle: number; dist: number };
}) {
  const { scene } = useThree();
  const uniforms = useMemo(() => ({ uNight: { value: look.night }, uLitRatio: { value: 0.24 } }), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [cx, , cz] = center;
  const buildings = useMemo(() => {
    const r = rng(seed);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const seeds = new Float32Array(count);
    const mat = new THREE.MeshStandardMaterial({ color: "#2a3140", roughness: 0.28, metalness: 0.65 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aSeed;\nvarying vec3 vCityPos;\nvarying vec3 vCityNormal;\nvarying float vCitySeed;")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvCityPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;\nvCityNormal = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);\nvCitySeed = aSeed;",
        );
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uNight;\nuniform float uLitRatio;\nvarying vec3 vCityPos;\nvarying vec3 vCityNormal;\nvarying float vCitySeed;")
        .replace("#include <map_fragment>", "#include <map_fragment>\n" + windowChunk)
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += cWin * 1.7;");
    };
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const o = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // Distribution en damier (avenues / rues) autour du centre, plus dense et plus haute vers Midtown.
      let x = 0;
      let z = 0;
      for (let tries = 0; tries < 8; tries++) {
        const ang = r() * Math.PI * 2;
        const dist = inner + Math.pow(r(), 0.7) * (outer - inner);
        x = Math.round((cx + Math.cos(ang) * dist) / 70) * 70 + (r() - 0.5) * 22;
        z = Math.round((cz + Math.sin(ang) * dist) / 30) * 30 + (r() - 0.5) * 8;
        if (!vista) break;
        const dx = x - cx;
        const dz = z - cz;
        const d = Math.hypot(dx, dz);
        const cos = (dx * vista.dir[0] + dz * vista.dir[1]) / Math.max(d, 1e-3) / Math.hypot(vista.dir[0], vista.dir[1]);
        if (d > vista.dist || cos < Math.cos(vista.angle)) break;
      }
      const tall = r() < 0.12;
      const h = tall ? 180 + r() * 260 : 30 + Math.pow(r(), 1.8) * 170;
      const w = 18 + r() * 34;
      const d = 16 + r() * 30;
      o.position.set(x, groundY, z);
      o.rotation.set(0, (r() < 0.8 ? 0 : 0.5) + (r() - 0.5) * 0.04, 0);
      o.scale.set(w, h, d);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      color.setHSL(0.6 + (r() - 0.5) * 0.08, 0.12, 0.16 + r() * 0.14);
      mesh.setColorAt(i, color);
      seeds[i] = r();
    }
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    mesh.frustumCulled = false;
    return mesh;
  }, [seed, count, inner, outer, cx, cz, groundY, uniforms, vista]);

  const ground = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: "#0f1216", roughness: 0.9 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vGPos;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uNight;\nvarying vec3 vGPos;")
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
  // Avenues (tous les 70 m) et rues (tous les 30 m) éclairées par les lampadaires et les phares.
  vec2 g = vec2(abs(fract(vGPos.x / 70.0 + 0.5) - 0.5) * 70.0, abs(fract(vGPos.z / 30.0 + 0.5) - 0.5) * 30.0);
  float street = max(1.0 - smoothstep(2.0, 5.0, g.x), 1.0 - smoothstep(1.5, 4.0, g.y));
  float lamps = street * (0.6 + 0.4 * step(0.7, fract(sin(floor(vGPos.x / 12.0) * 3.1 + floor(vGPos.z / 12.0) * 7.7) * 437.5)));
  totalEmissiveRadiance += vec3(1.0, 0.62, 0.3) * lamps * uNight * 1.4;`,
        );
    };
    return m;
  }, [uniforms]);

  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uNight: uniforms.uNight, uGlow: { value: look.sunGlow }, uSunDir: { value: new THREE.Vector3(...sunDir).normalize() } },
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uNight; uniform float uGlow; uniform vec3 uSunDir; varying vec3 vDir;
          void main(){
            float h = clamp(vDir.y, -0.2, 1.0);
            vec3 dayZen = vec3(0.32, 0.5, 0.78), dayHor = vec3(0.78, 0.84, 0.9);
            vec3 nightZen = vec3(0.01, 0.015, 0.035), nightHor = vec3(0.07, 0.09, 0.15);
            vec3 zen = mix(dayZen, nightZen, uNight), hor = mix(dayHor, nightHor, uNight);
            vec3 c = mix(hor, zen, smoothstep(0.0, 0.55, h));
            float sun = max(dot(normalize(vDir), uSunDir), 0.0);
            vec3 glow = vec3(1.0, 0.55, 0.25) * (pow(sun, 6.0) * 0.9 + pow(sun, 60.0) * 3.0) * uGlow * (1.0 - smoothstep(0.0, 0.5, h));
            c += glow + vec3(0.9, 0.45, 0.35) * uGlow * 0.35 * (1.0 - smoothstep(0.0, 0.25, h));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const fogColor = useRef(new THREE.Color());
  useFrame(() => {
    uniforms.uNight.value = look.night;
    sky.uniforms.uGlow!.value = look.sunGlow;
    // Brume de distance accordée à l'horizon (perspective atmosphérique).
    const f = fogColor.current;
    f.setRGB(0.78, 0.84, 0.9).lerp(new THREE.Color(0.07, 0.09, 0.15), look.night).lerp(new THREE.Color(0.95, 0.6, 0.45), look.sunGlow * 0.35);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(f);
  });

  useEffect(() => {
    const prev = scene.fog;
    scene.fog = new THREE.FogExp2("#101828", 0.00085);
    return () => {
      scene.fog = prev;
    };
  }, [scene]);

  return (
    <group>
      <mesh material={sky} renderOrder={-10}>
        <sphereGeometry args={[3500, 32, 16]} />
      </mesh>
      <primitive object={buildings} />
      <mesh material={ground} position={[center[0], groundY, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5000, 5000]} />
      </mesh>
    </group>
  );
}
