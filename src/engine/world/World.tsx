"use client";
/**
 * Scène du monde ouvert : l'étage, son mobilier, le bureau décoré du joueur, les personnages. Prend la main
 * sur la caméra tant qu'il est actif (à l'épaule, ou plongée sur le bureau en mode décoration).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useProfile } from "../state/profile";
import { Building } from "./Building";
import { Merged } from "./Merged";
import { CATALOG, WALL_ITEMS, canPlace, newId, snap, wallSnap } from "./decor";
import { FurnitureItem } from "./Furniture";
import { FOOTPRINT, FURNITURE, PLAYER_BOARD, PLAYER_OFFICE, type Placed } from "./layout";
import { installPlayerInput } from "./player";
import { useWorld, worldRuntime } from "./runtime";
import { buildWorld, decorNow, stepWorld, worldSys } from "./system";

const DT_MAX = typeof window !== "undefined" && window.location.search.includes("lite") ? 0.3 : 0.05;

const DUMMY = new THREE.PerspectiveCamera();

/** Aperçu de placement (mode décoration), partagé avec l'interface. */
export const editGhost = { item: null as Placed | null, ok: false, reason: "" };

function StaticFurniture() {
  return (
    <Merged>
      {FURNITURE.map((f) => (
        <FurnitureItem key={f.id} item={f} />
      ))}
      <FurnitureItem item={{ id: "p-board", type: "corkboard", x: PLAYER_BOARD.x, z: PLAYER_BOARD.z, rot: PLAYER_BOARD.rot }} />
    </Merged>
  );
}

function Decor() {
  const decor = useProfile((s) => s.decor) as Placed[] | null;
  const items = decor ?? decorNow();
  const sel = useWorld((s) => s.editSel);
  const edit = useWorld((s) => s.edit);
  const moving = sel?.mode === "move" ? sel.id : null;
  const list = items.filter((d) => d.id !== moving).map((d) => <FurnitureItem key={d.id} item={d} />);
  // Hors décoration, le bureau est fusionné comme le reste de l'étage.
  return edit ? <group>{list}</group> : <Merged deps={[items]}>{list}</Merged>;
}

/** Mode décoration : l'objet suit le pointeur sur le sol du bureau ; clic pour poser, R pour tourner. */
function EditLayer() {
  const sel = useWorld((s) => s.editSel);
  const [ghost, setGhost] = useState<Placed | null>(null);
  const rot = useRef(0);
  const decor = useProfile((s) => s.decor) as Placed[] | null;
  const items = useMemo(() => decor ?? decorNow(), [decor]);

  useEffect(() => {
    const src = sel?.mode === "move" ? items.find((i) => i.id === sel.id) : null;
    rot.current = src?.rot ?? 0;
    if (!sel) setGhost(null);
    else if (src) setGhost({ ...src });
    else if (sel.mode === "new")
      setGhost({ id: newId(sel.type), type: sel.type, v: sel.v, x: (PLAYER_OFFICE.x0 + PLAYER_OFFICE.x1) / 2, z: (PLAYER_OFFICE.z0 + PLAYER_OFFICE.z1) / 2 + 0.6, rot: 0 });
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "r") return;
      rot.current += Math.PI / 2;
      setGhost((g) => (g ? { ...g, rot: rot.current } : g));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [sel, items]);

  useEffect(() => {
    if (!ghost) {
      editGhost.item = null;
      return;
    }
    const g = WALL_ITEMS.has(ghost.type) ? wallSnap(ghost) : ghost;
    const c = canPlace(g, items);
    editGhost.item = g;
    editGhost.ok = c.ok;
    editGhost.reason = c.reason ?? "";
  }, [ghost, items]);

  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!ghost) return;
    const p = e.point;
    setGhost((g) => (g ? { ...g, x: snap(p.x), z: snap(p.z), rot: rot.current } : g));
  };
  const place = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent("bh-decor-place"));
  };
  const o = PLAYER_OFFICE;
  const shown = ghost ? (WALL_ITEMS.has(ghost.type) ? wallSnap(ghost) : ghost) : null;
  const fp = shown ? FOOTPRINT[shown.type] : [1, 1];
  const ok = editGhost.ok;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(o.x0 + o.x1) / 2, 0.01, (o.z0 + o.z1) / 2]} onPointerMove={move} onClick={place}>
        <planeGeometry args={[o.x1 - o.x0 + 1, o.z1 - o.z0 + 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Grille du bureau. */}
      <gridHelper args={[8, 32, "#c9a24a", "#c9a24a"]} position={[(o.x0 + o.x1) / 2, 0.012, (o.z0 + o.z1) / 2]} material-transparent material-opacity={0.18} />
      {shown && (
        <group>
          <FurnitureItem item={shown} />
          <mesh position={[shown.x, 0.02, shown.z]} rotation={[-Math.PI / 2, 0, shown.rot]}>
            <planeGeometry args={[fp[0], fp[1]]} />
            <meshBasicMaterial color={ok ? "#4ad07a" : "#e0503a"} transparent opacity={0.35} depthWrite={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Runner() {
  const { camera } = useThree();
  const edit = useWorld((s) => s.edit);
  const cam = camera as THREE.PerspectiveCamera;
  const editPos = useMemo(() => new THREE.Vector3(6.5, 6.6, -4.2), []);
  useEffect(() => installPlayerInput(), []);
  useFrame((_, dt) => {
    if (!useWorld.getState().active) return;
    if (cam.fov !== 55 || cam.far !== 3000 || cam.near !== 0.05) {
      cam.fov = 55;
      cam.near = 0.05;
      cam.far = 3000;
      cam.updateProjectionMatrix();
    }
    // Pas de temps borné (à-coups) ; en test logiciel (?lite) on tolère de grands pas.
    const d = Math.min(dt, DT_MAX);
    if (edit) {
      worldRuntime.frozen = true;
      stepWorld(d, DUMMY, cam);
      cam.position.lerp(editPos, Math.min(1, dt * 4));
      cam.lookAt(6.5, 0, -9.6);
      return;
    }
    stepWorld(d, cam);
  });
  return null;
}

export function WorldScene() {
  const edit = useWorld((s) => s.edit);
  useEffect(() => {
    void buildWorld();
  }, []);
  return (
    <group>
      <Building />
      <StaticFurniture />
      <Decor />
      <primitive object={worldSys.group} />
      {edit && <EditLayer />}
      <Runner />
    </group>
  );
}

export function WorldStage() {
  const mounted = useWorld((s) => s.active);
  return mounted ? <WorldScene /> : null;
}

export { CATALOG };
