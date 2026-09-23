"use client";
/**
 * Le bureau de l'audit, en 3D : feuilles imprimées qu'on prend en main (elles suivent la tête), annexes
 * agrafées dont les pages se soulèvent en se courbant, surligneur qui encre le papier, loupe en laiton qui
 * grossit l'impression, post-its manuscrits collés dans la marge, café qui refroidit.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { audio } from "../audio/AudioEngine";
import { DESK_Y } from "../hub/space";
import { CoffeeCup } from "../hub/DeskObjects";
import { ContactShadow } from "../hub/Hoverable";
import { PBR } from "../three/pbr";
import { pageCache, pageSize, type Box } from "./docRenderer";
import { inkSegment, marksFor } from "./marks";
import { strokeTarget, latestMarks } from "./scoring";
import { makeSheetMaterial } from "./sheetMaterial";
import { auditBus, useAudit } from "./state";
import type { AuditDoc } from "./types";

const SHEET_W = 0.216;

// ------------------------------------------------------------------ Géométrie de page qui se courbe
const ROWS = 24;

/** Replace les sommets d'une page : charnière en haut, `flip` 0..1 (0 = à plat, 1 = rabattue par-dessus). */
function bendPage(geo: THREE.PlaneGeometry, w: number, h: number, flip: number, restCurl = 0.05) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  // La page se soulève, passe au-dessus de l'agrafe et se rabat derrière la liasse.
  const A = flip * Math.PI * 1.9;
  const curl = 1.1 * Math.sin(flip * Math.PI) + restCurl;
  // Profil (y, z) le long de la page, depuis la charnière.
  const prof: [number, number][] = [[0, 0]];
  for (let j = 1; j <= ROWS; j++) {
    const s = ((j - 0.5) / ROWS) * h;
    const a = A + curl * Math.pow(s / h, 2);
    const ds = h / ROWS;
    const prev = prof[j - 1]!;
    prof.push([prev[0] - Math.cos(a) * ds, prev[1] + Math.sin(a) * ds]);
  }
  for (let i = 0; i < pos.count; i++) {
    const y0 = pos.getY(i);
    const j = Math.round(((h / 2 - y0) / h) * ROWS);
    const p = prof[Math.max(0, Math.min(ROWS, j))]!;
    pos.setY(i, h / 2 + p[0]);
    pos.setZ(i, p[1]);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  void w;
}

// ------------------------------------------------------------------ Post-it manuscrit
function handFont(): string {
  if (typeof document === "undefined") return "cursive";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-hand").trim();
  return v || "'Comic Sans MS', cursive";
}

const postitCache = new Map<string, THREE.CanvasTexture>();
function postitTexture(text: string): THREE.CanvasTexture {
  let t = postitCache.get(text);
  if (t) return t;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const draw = () => {
    const x = c.getContext("2d")!;
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#f7e57a");
    g.addColorStop(1, "#efd85a");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    x.fillStyle = "rgba(0,0,0,0.06)";
    x.fillRect(0, 0, 256, 30);
    x.fillStyle = "#1c2f6a";
    x.font = `600 46px ${handFont()}`;
    x.textAlign = "center";
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const tt = line ? `${line} ${w}` : w;
      if (x.measureText(tt).width > 220 && line) {
        lines.push(line);
        line = w;
      } else line = tt;
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => x.fillText(l, 128, 118 + (i - (lines.length - 1) / 2) * 50));
    if (t) t.needsUpdate = true;
  };
  draw();
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  postitCache.set(text, t);
  if (typeof document !== "undefined") void document.fonts.load(`600 46px ${handFont()}`).then(draw);
  return t;
}

// ------------------------------------------------------------------ Un document (une ou plusieurs pages)
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();

function DocObject({ doc, index }: { doc: AuditDoc; index: number }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const readLight = useRef<THREE.PointLight>(null);
  const lift = useRef(0);
  const flips = useRef<number[]>(doc.pages.map(() => 0));
  const { camera, gl } = useThree();
  const variantKey = useAudit((s) => s.variantKey);
  const reading = useAudit((s) => s.reading === doc.id);
  const page = useAudit((s) => s.pages[doc.id] ?? 0);
  const marks = useAudit((s) => s.marks);
  const def = useAudit((s) => s.def);
  const { w: PW, h: PH } = pageSize(doc);
  const ratio = PH / PW;
  const W = SHEET_W;
  const H = SHEET_W * ratio;

  const pages = useMemo(
    () =>
      doc.pages.map((_, i) => {
        const r = pageCache(doc, i, variantKey);
        const t = new THREE.CanvasTexture(r.canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 16;
        const m = marksFor(doc.id, i, ratio);
        const { material, uniforms } = makeSheetMaterial(t, m.tex, W / H);
        const geo = new THREE.PlaneGeometry(W, H, 2, ROWS);
        bendPage(geo, W, H, 0);
        return { rendered: r, texture: t, material, uniforms, geo, layer: m };
      }),
    [doc, variantKey, ratio, W, H],
  );
  const back = useMemo(() => PBR.paper({ color: "#f4f0e6" }), []);
  const backMat = useMemo(() => {
    const m = back.clone();
    m.side = THREE.BackSide;
    return m;
  }, [back]);
  const staple = useMemo(() => PBR.steel({ color: "#c8ccd2", roughness: 0.6 }), []);
  const brass = useMemo(() => PBR.brass(), []);
  const lensGlass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, transmission: 1, thickness: 0.004, ior: 1.52, transparent: true, opacity: 0.35 }), []);

  useEffect(
    () => () => {
      for (const p of pages) {
        p.texture.dispose();
        p.material.dispose();
        p.geo.dispose();
      }
    },
    [pages],
  );

  // ---------------------------------------------------------------- pose (bureau ↔ en main)
  const deskPos = useMemo(() => new THREE.Vector3(doc.desk.x, DESK_Y + 0.0008 + index * 0.0006, doc.desk.z), [doc, index]);
  const deskQuat = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, doc.desk.rot, "XYZ")).premultiply(new THREE.Quaternion()), [doc]);
  const pointer = useRef({ x: 0, y: 0 });

  useFrame(({ pointer: p }, dt) => {
    const g = group.current;
    if (!g) return;
    pointer.current.x += (p.x - pointer.current.x) * Math.min(1, dt * 6);
    pointer.current.y += (p.y - pointer.current.y) * Math.min(1, dt * 6);
    const target = reading ? 1 : 0;
    lift.current += (target - lift.current) * Math.min(1, dt * 5.5);
    const t = lift.current;
    const e = t * t * (3 - 2 * t);
    // Pose « en main », dans le repère de la caméra.
    const zoom = useAudit.getState().zoom;
    const dist = (0.4 / zoom) * (doc.format === "half" ? 0.85 : 1);
    const panX = -pointer.current.x * 0.07 * (zoom - 1);
    const panY = -pointer.current.y * 0.1 * (zoom - 1);
    tmpV.set(panX, panY - 0.004, -dist);
    tmpQ.setFromEuler(new THREE.Euler(-0.06 + pointer.current.y * 0.03, pointer.current.x * -0.04, 0));
    tmpM.compose(tmpV, tmpQ, tmpS.set(1, 1, 1)).premultiply(camera.matrixWorld);
    const readPos = new THREE.Vector3();
    const readQuat = new THREE.Quaternion();
    tmpM.decompose(readPos, readQuat, tmpS);
    g.position.lerpVectors(deskPos, readPos, e);
    g.position.y += Math.sin(Math.PI * t) * 0.05;
    g.quaternion.slerpQuaternions(deskQuat, readQuat, e);

    // Pages : on rabat celles qui précèdent la page courante.
    const cur = useAudit.getState().pages[doc.id] ?? 0;
    pages.forEach((pg, i) => {
      const want = i < cur ? 1 : 0;
      const f = flips.current[i]!;
      if (Math.abs(want - f) > 0.001) {
        const nf = f + (want - f) * Math.min(1, dt * 5);
        flips.current[i] = Math.abs(want - nf) < 0.002 ? want : nf;
        bendPage(pg.geo, W, H, flips.current[i]!);
      }
    });

    // Loupe : désactivée dès qu'on change d'outil.
    if (useAudit.getState().tool !== "loupe") for (const pg of pages) pg.uniforms.uLens.value.z = -1;
    // Lumière de lecture : la lampe éclaire la feuille tenue (depuis la gauche, un peu au-dessus).
    if (readLight.current) {
      // Assez loin et de face pour un éclairage régulier (pas de haut de page brûlé).
      readLight.current.intensity = 0.32 * e;
      readLight.current.position.copy(g.position).add(tmpV.set(-0.3, 0.02, 0.5).applyQuaternion(camera.quaternion));
    }
    // Loupe : l'anneau suit le point visé.
    if (ring.current) {
      const u = pages[cur]?.uniforms.uLens.value;
      const on = reading && useAudit.getState().tool === "loupe" && u && u.z > 0;
      ring.current.visible = !!on;
      if (on && u) ring.current.position.set((u.x - 0.5) * W, (u.y - 0.5) * H, 0.02 + (pages.length - cur) * 0.0005);
    }
  });

  // ---------------------------------------------------------------- surligneur
  const stroke = useRef<{ x: number; y: number }[] | null>(null);
  const toPage = (e: ThreeEvent<PointerEvent>) => (e.uv ? { x: e.uv.x, y: 1 - e.uv.y } : null);

  const onDown = (e: ThreeEvent<PointerEvent>, i: number) => {
    const st = useAudit.getState();
    if (!st.active || useAudit.getState().pending) return;
    e.stopPropagation();
    if (st.reading !== doc.id) {
      useAudit.getState().set({ reading: doc.id, zoom: 1 });
      void audio.sfx("sfx-paper-slide", { volume: 0.6, rate: 1.2 });
      return;
    }
    if (st.tool !== "highlighter" || i !== (st.pages[doc.id] ?? 0)) return;
    const p = toPage(e);
    if (!p) return;
    (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
    stroke.current = [p];
    void audio.sfx("sfx-highlighter", { volume: 0.35 });
  };
  const onMove = (e: ThreeEvent<PointerEvent>, i: number) => {
    const st = useAudit.getState();
    const p = toPage(e);
    if (!p) return;
    if (st.tool === "loupe" && st.reading === doc.id && i === (st.pages[doc.id] ?? 0)) {
      const u = pages[i]!.uniforms.uLens.value;
      u.set(p.x, 1 - p.y, 0.1);
    }
    const s = stroke.current;
    if (!s) return;
    const last = s[s.length - 1]!;
    if (Math.hypot(p.x - last.x, p.y - last.y) < 0.003) return;
    s.push(p);
    inkSegment(pages[i]!.layer, last, p);
  };
  const onUp = (i: number) => {
    const s = stroke.current;
    stroke.current = null;
    if (!s || s.length < 2) return;
    const boxes = pages[i]!.rendered.boxes as Record<string, Box>;
    const target = strokeTarget(s, boxes, 0.35);
    if (target) auditBus.emit({ type: "highlight", docId: doc.id, lineId: target });
  };
  const onOut = (i: number) => {
    pages[i]!.uniforms.uLens.value.z = -1;
  };

  // Post-its sur la page affichée.
  const postits = useMemo(() => {
    if (!def) return [];
    const active = latestMarks(marks);
    const out: { page: number; y: number; text: string; rot: number; key: string }[] = [];
    for (const m of active) {
      pages.forEach((pg, i) => {
        const b = pg.rendered.boxes[m.lineId];
        if (!b) return;
        const a = def.anomalies.find((x) => x.id === m.category);
        out.push({ page: i, y: (b.y0 + b.y1) / 2, text: a?.short ?? "?", rot: ((m.lineId.length * 37) % 10) / 100 - 0.05, key: m.lineId });
      });
    }
    return out;
  }, [marks, def, pages]);
  const postitMats = useMemo(() => new Map<string, THREE.MeshStandardMaterial>(), []);
  const matFor = (text: string) => {
    let m = postitMats.get(text);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ map: postitTexture(text), roughness: 0.8 });
      postitMats.set(text, m);
    }
    return m;
  };

  useEffect(() => {
    const up = () => onUp(useAudit.getState().pages[doc.id] ?? 0);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, pages, doc.id]);

  return (
    <>
    <pointLight ref={readLight} color="#ffe2b8" intensity={0} distance={2.2} decay={2} />
    <group ref={group}>
      {pages.map((pg, i) => (
        <group key={i} position={[0, 0, (pages.length - i) * 0.0004]}>
          <mesh
            geometry={pg.geo}
            material={pg.material}
            castShadow
            receiveShadow
            onPointerDown={(e) => onDown(e, i)}
            onPointerMove={(e) => onMove(e, i)}
            onPointerOut={() => onOut(i)}
          />
          <mesh geometry={pg.geo} material={backMat} castShadow receiveShadow />
          {postits
            .filter((p) => p.page === i && i === page)
            .map((p) => (
              <mesh key={p.key} material={matFor(p.text)} position={[W / 2 - 0.004, (0.5 - p.y) * H, 0.0012]} rotation={[0, 0, p.rot]} castShadow>
                <planeGeometry args={[0.042, 0.042]} />
              </mesh>
            ))}
        </group>
      ))}
      {doc.pages.length > 1 && (
        <mesh material={staple} position={[-W / 2 + 0.012, H / 2 - 0.012, pages.length * 0.0004 + 0.0012]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.012, 0.0012, 0.0008]} />
        </mesh>
      )}
      {/* Loupe en main : anneau de laiton + verre. */}
      <group ref={ring} visible={false}>
        <mesh material={brass}>
          <torusGeometry args={[0.1 * H, 0.0035, 12, 64]} />
        </mesh>
        <mesh material={lensGlass}>
          <circleGeometry args={[0.1 * H, 48]} />
        </mesh>
        <mesh material={brass} position={[0.1 * H * 0.72 + 0.03, -0.1 * H * 0.72 - 0.03, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.005, 0.006, 0.07, 12]} />
        </mesh>
      </group>
    </group>
    </>
  );
}

// ------------------------------------------------------------------ Outils sur le bureau
function Highlighter() {
  const g = useRef<THREE.Group>(null);
  const body = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#f4d31c", roughness: 0.35, clearcoat: 0.8 }), []);
  const cap = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#1a1a1a", roughness: 0.3, clearcoat: 0.6 }), []);
  useFrame((_, dt) => {
    if (!g.current) return;
    const held = useAudit.getState().tool === "highlighter";
    g.current.position.y += ((held ? 0.03 : 0) - g.current.position.y) * Math.min(1, dt * 8);
    g.current.visible = !held || g.current.position.y < 0.025;
  });
  return (
    <group position={[-0.66, DESK_Y, -0.82]} rotation={[0, 0.5, 0]}>
      <ContactShadow w={0.13} d={0.03} />
      <group ref={g} onClick={(e) => (e.stopPropagation(), useAudit.getState().set({ tool: "highlighter" }))}>
        <mesh material={body} position={[0, 0.011, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[0.011, 0.1, 6, 20]} />
        </mesh>
        <mesh material={cap} position={[0.055, 0.011, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.0118, 0.0118, 0.03, 20]} />
        </mesh>
      </group>
    </group>
  );
}

function Magnifier() {
  const g = useRef<THREE.Group>(null);
  const brass = useMemo(() => PBR.brass(), []);
  const handle = useMemo(() => PBR.wood("walnut"), []);
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, transmission: 1, thickness: 0.006, ior: 1.52 }), []);
  useFrame(() => {
    if (g.current) g.current.visible = useAudit.getState().tool !== "loupe";
  });
  return (
    <group position={[-0.24, DESK_Y, -0.88]} rotation={[0, -0.4, 0]}>
      <ContactShadow w={0.16} d={0.08} />
      <group ref={g} onClick={(e) => (e.stopPropagation(), useAudit.getState().set({ tool: "loupe" }))}>
        <mesh material={brass} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.04, 0.004, 12, 48]} />
        </mesh>
        <mesh material={glass} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.04, 40]} />
        </mesh>
        <mesh material={handle} position={[0.075, 0.006, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.006, 0.007, 0.07, 16]} />
        </mesh>
      </group>
    </group>
  );
}

// ------------------------------------------------------------------ Bureau de l'audit
export function AuditDesk() {
  const def = useAudit((s) => s.def);
  const { gl } = useThree();
  const tool = useAudit((s) => s.tool);

  // Molette / pincement = zoom sur la feuille tenue.
  useEffect(() => {
    const el = gl.domElement;
    const wheel = (e: WheelEvent) => {
      const st = useAudit.getState();
      if (!st.reading) return;
      e.preventDefault();
      st.set({ zoom: THREE.MathUtils.clamp(st.zoom * Math.exp(-e.deltaY * 0.0015), 1, 2.4) });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [gl]);

  // Curseur selon l'outil.
  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = tool === "highlighter" ? HIGHLIGHTER_CURSOR : tool === "loupe" ? "none" : "";
    return () => {
      el.style.cursor = "";
    };
  }, [gl, tool]);

  if (!def) return null;
  return (
    <group>
      {def.docs.map((d, i) => (
        <DocObject key={d.id} doc={d} index={i} />
      ))}
      <Highlighter />
      <Magnifier />
      <group position={[0.64, DESK_Y, -0.78]}>
        <ContactShadow w={0.09} d={0.09} />
        <CoffeeCup />
      </group>
    </group>
  );
}

/** Rien dans le repère « vue » pour l'instant (les feuilles tenues suivent la caméra elles-mêmes). */
export function AuditReading() {
  return null;
}

const HIGHLIGHTER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><g transform="rotate(45 16 16)"><rect x="12" y="2" width="8" height="20" rx="2" fill="#f4d31c" stroke="#1a1a1a" stroke-width="1"/><path d="M12 22 h8 l-2 6 h-4 z" fill="#1a1a1a"/><rect x="13.5" y="27" width="5" height="3" fill="#f4e23c"/></g></svg>',
)}") 4 28, crosshair`;
