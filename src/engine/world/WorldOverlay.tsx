"use client";
/**
 * Interface du monde ouvert : lieu et heure, budget, objectif, invite d'interaction (E), menus de dialogue
 * (touches 1 à 9), aide des commandes, joystick tactile, et le panneau de décoration du bureau
 * (catalogue, achat, déplacement, revente).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { newYorkTime } from "@/lib/time";
import { audio } from "../audio/AudioEngine";
import { useProfile } from "../state/profile";
import { CATALOG, ESSENTIAL, budget, defaultDecor, nameOf, priceOf, type CatalogItem } from "./decor";
import type { Placed } from "./layout";
import { toast, useWorld, worldBus, worldRuntime } from "./runtime";
import { inPlayerOffice, rebuildCollision } from "./system";
import { editGhost } from "./World";

const money = (n: number) => `${n.toLocaleString("fr-FR")} $`;

function Hud() {
  const room = useWorld((s) => s.room);
  const billed = useProfile((s) => s.billed);
  const spent = useProfile((s) => s.spent);
  const coffee = useWorld((s) => s.coffeeUntil);
  const [clock, setClock] = useState(() => newYorkTime().digital);
  useEffect(() => {
    const t = window.setInterval(() => setClock(newYorkTime().digital), 10_000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="pointer-events-none absolute left-[max(1rem,env(safe-area-inset-left))] top-4 grid gap-1 rounded-sm bg-black/45 px-3 py-2 backdrop-blur-[2px]">
      <p className="font-serif text-base text-ivory">{room || "Harlow & Vance"}</p>
      <p className="text-[0.62rem] uppercase tracking-[0.25em] text-ivory/60">
        48e étage · New York {clock}
      </p>
      <p className="text-[0.62rem] uppercase tracking-[0.25em] text-brass/90">
        Honoraires {money(billed)} · Budget déco {money(budget({ billed, spent }))}
      </p>
      {coffee > Date.now() && <p className="text-[0.62rem] uppercase tracking-[0.25em] text-[#9fd1a0]">● Concentration (café)</p>}
    </div>
  );
}

function Objective() {
  const o = useWorld((s) => s.objective);
  if (!o) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 max-w-[min(34rem,70vw)] -translate-x-1/2 rounded-full border border-brass/40 bg-black/50 px-4 py-1.5 text-center text-xs text-ivory/90 backdrop-blur-[2px]">
      <span className="mr-2 text-brass">◆</span>
      {o}
    </div>
  );
}

function Toast() {
  const t = useWorld((s) => s.toast);
  const [shown, setShown] = useState(t);
  useEffect(() => {
    if (!t) return;
    setShown(t);
    const h = window.setTimeout(() => setShown(null), Math.max(4200, t.text.length * 55));
    return () => window.clearTimeout(h);
  }, [t]);
  if (!shown) return null;
  return (
    <div key={shown.id} className="pointer-events-none absolute left-1/2 top-16 w-[min(32rem,90vw)] -translate-x-1/2 animate-hotspot-in rounded-sm border border-ivory/15 bg-[#0b0e14]/85 px-4 py-3 text-center font-serif text-sm text-ivory shadow-xl" role="status">
      {shown.text}
    </div>
  );
}

function PromptKey() {
  const p = useWorld((s) => s.prompt);
  const menu = useWorld((s) => s.menu);
  if (!p || menu) return null;
  return (
    <button
      type="button"
      onClick={() => worldBus.emit({ type: "interact", id: p.id })}
      className="pointer-events-auto absolute bottom-[18vh] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-brass/50 bg-black/60 py-2 pl-2 pr-5 text-sm text-ivory shadow-xl backdrop-blur hover:border-brass"
    >
      <kbd className="grid h-8 w-8 place-items-center rounded-full bg-brass font-sans text-sm font-bold text-ink">{p.key}</kbd>
      {p.label}
    </button>
  );
}

function Menu() {
  const menu = useWorld((s) => s.menu);
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      const o = menu.options[i];
      if (o && !o.disabled) worldBus.emit({ type: "menu", id: o.id });
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [menu]);
  if (!menu) return null;
  return (
    <div className="pointer-events-auto absolute bottom-[4vh] left-1/2 w-[min(36rem,94vw)] -translate-x-1/2 animate-hotspot-in rounded-sm border border-brass/35 bg-[#0a0d13]/92 p-4 shadow-2xl" role="dialog" aria-label={menu.title}>
      <p className="text-[0.62rem] uppercase tracking-[0.35em] text-brass">{menu.title}</p>
      {menu.subtitle && <p className="mt-1 text-xs text-ivory/60">{menu.subtitle}</p>}
      <ul className="mt-3 grid gap-2">
        {menu.options.map((o, i) => (
          <li key={o.id}>
            <button
              type="button"
              disabled={o.disabled}
              onClick={() => worldBus.emit({ type: "menu", id: o.id })}
              className="flex w-full items-baseline gap-3 rounded-sm border border-ivory/15 px-3 py-2 text-left font-serif text-[0.95rem] text-ivory transition enabled:hover:border-brass enabled:hover:bg-brass/10 disabled:opacity-40"
            >
              <span className="font-sans text-xs text-brass/80">{i + 1}</span>
              <span className="flex-1">{o.label}</span>
              {o.hint && <span className="font-sans text-[0.65rem] uppercase tracking-[0.15em] text-ivory/50">{o.hint}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Help() {
  const help = useWorld((s) => s.help);
  const touch = useMemo(() => typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches, []);
  if (touch) return null;
  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 rounded-sm bg-black/45 px-3 py-2 text-[0.68rem] leading-relaxed text-ivory/75 backdrop-blur-[2px]">
      {help ? (
        <>
          <p>
            <b className="text-ivory">ZQSD / WASD / flèches</b> marcher · <b className="text-ivory">Maj</b> courir
          </p>
          <p>
            <b className="text-ivory">Souris (glisser)</b> regarder · <b className="text-ivory">molette</b> zoom · <b className="text-ivory">V</b> vue subjective
          </p>
          <p>
            <b className="text-ivory">E</b> parler / utiliser · <b className="text-ivory">B</b> aménager votre bureau · <b className="text-ivory">H</b> masquer l&apos;aide
          </p>
        </>
      ) : (
        <p>H : aide</p>
      )}
    </div>
  );
}

/** Joystick tactile (écrans tactiles) + bouton d'action. */
function TouchControls() {
  const touch = useMemo(() => typeof window !== "undefined" && matchMedia("(pointer: coarse)").matches, []);
  const knob = useRef<HTMLDivElement>(null);
  const prompt = useWorld((s) => s.prompt);
  if (!touch) return null;
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.min(1, Math.hypot(x, y));
    const a = Math.atan2(y, x);
    worldRuntime.input.x = Math.cos(a) * l;
    worldRuntime.input.z = -Math.sin(a) * l;
    worldRuntime.input.run = l > 0.92;
    if (knob.current) knob.current.style.transform = `translate(${Math.cos(a) * l * 40}px, ${Math.sin(a) * l * 40}px)`;
  };
  const end = () => {
    worldRuntime.input.x = 0;
    worldRuntime.input.z = 0;
    worldRuntime.input.run = false;
    if (knob.current) knob.current.style.transform = "";
  };
  return (
    <>
      <div
        className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 grid h-32 w-32 touch-none place-items-center rounded-full border border-ivory/25 bg-black/30"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => e.buttons && move(e)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div ref={knob} className="h-12 w-12 rounded-full bg-ivory/70" />
      </div>
      {prompt && (
        <button type="button" onClick={() => worldBus.emit({ type: "interact", id: prompt.id })} className="pointer-events-auto absolute bottom-[max(2rem,env(safe-area-inset-bottom))] right-6 grid h-16 w-16 place-items-center rounded-full bg-brass font-sans text-lg font-bold text-ink shadow-xl">
          E
        </button>
      )}
    </>
  );
}

function EditButton() {
  const [inside, setInside] = useState(false);
  const edit = useWorld((s) => s.edit);
  useEffect(() => {
    const t = window.setInterval(() => setInside(inPlayerOffice()), 300);
    const key = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b" && useWorld.getState().active && !useWorld.getState().menu && inPlayerOffice()) toggleEdit(!useWorld.getState().edit);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("keydown", key);
    };
  }, []);
  if (!inside || edit) return null;
  return (
    <button type="button" onClick={() => toggleEdit(true)} className="pointer-events-auto absolute bottom-4 right-4 rounded-full border border-brass/60 bg-black/60 px-5 py-2 text-[0.7rem] uppercase tracking-[0.3em] text-brass-light shadow-xl hover:bg-brass/15">
      Aménager le bureau (B)
    </button>
  );
}

function toggleEdit(on: boolean) {
  worldRuntime.frozen = on;
  useWorld.getState().set({ edit: on, editSel: null, prompt: null });
  if (!on) rebuildCollision();
}

function currentDecor(): Placed[] {
  return (useProfile.getState().decor as Placed[] | null) ?? defaultDecor();
}

/** Panneau de décoration : catalogue, meubles en place, budget. */
function EditPanel() {
  const edit = useWorld((s) => s.edit);
  const sel = useWorld((s) => s.editSel);
  const billed = useProfile((s) => s.billed);
  const spent = useProfile((s) => s.spent);
  const rank = useProfile((s) => s.officeRank);
  const decor = useProfile((s) => s.decor) as Placed[] | null;
  const items = decor ?? defaultDecor();
  const [tab, setTab] = useState<CatalogItem["cat"] | "mine">("Déco");
  const cash = budget({ billed, spent });

  useEffect(() => {
    if (!edit) return;
    const place = () => {
      const s = useWorld.getState().editSel;
      const g = editGhost.item;
      if (!s || !g) return;
      if (!editGhost.ok) {
        toast(editGhost.reason || "Impossible ici.");
        return;
      }
      const cur = currentDecor();
      if (s.mode === "move") {
        useProfile.getState().setDecor(cur.map((d) => (d.id === s.id ? { ...g, id: s.id } : d)), 0);
        audio.sfx("sfx-desk-knock", { volume: 0.5 });
      } else {
        const price = priceOf(g);
        if (price > budget(useProfile.getState())) {
          toast("Budget insuffisant. Facturez d'abord quelques heures.");
          return;
        }
        let next = [...cur, g];
        let refund = 0;
        // Un nouveau bureau (ou fauteuil) remplace l'ancien, revendu à moitié prix.
        for (const kind of ["desk", "chair"] as const) {
          if (ESSENTIAL[kind]!.includes(g.type)) {
            const old = cur.find((d) => ESSENTIAL[kind]!.includes(d.type));
            if (old) {
              next = next.filter((d) => d.id !== old.id);
              refund += Math.round(priceOf(old) * 0.5);
            }
          }
        }
        useProfile.getState().setDecor(next, price - refund);
        audio.sfx("sfx-coins-counter", { volume: 0.5 });
        toast(`${nameOf(g)} : ${money(price)}${refund ? ` (ancien meuble revendu ${money(refund)})` : ""}`);
      }
      useWorld.getState().set({ editSel: null });
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (useWorld.getState().editSel) useWorld.getState().set({ editSel: null });
        else toggleEdit(false);
      }
    };
    window.addEventListener("bh-decor-place", place);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("bh-decor-place", place);
      window.removeEventListener("keydown", esc);
    };
  }, [edit]);

  if (!edit) return null;
  const sell = (d: Placed) => {
    if (ESSENTIAL.desk!.includes(d.type) || d.type === "chair-exec") {
      toast("On ne vend pas son bureau ni son fauteuil : achetez-en un autre pour le remplacer.");
      return;
    }
    const refund = Math.round(priceOf(d) * 0.5);
    useProfile.getState().setDecor(
      items.filter((x) => x.id !== d.id),
      -refund,
    );
    toast(`${nameOf(d)} revendu ${money(refund)}.`);
  };
  const cats: (CatalogItem["cat"] | "mine")[] = ["Bureaux", "Sièges", "Rangement", "Déco", "Prestige", "mine"];
  return (
    <div className="pointer-events-auto absolute inset-y-4 right-4 flex w-[min(22rem,92vw)] flex-col rounded-sm border border-brass/35 bg-[#0a0d13]/92 p-4 text-ivory shadow-2xl">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-brass">Aménager votre bureau</h2>
        <button type="button" className="text-xs uppercase tracking-[0.25em] text-ivory/70 hover:text-ivory" onClick={() => toggleEdit(false)}>
          Terminer
        </button>
      </div>
      <p className="mt-1 text-xs text-ivory/60">Budget : {money(cash)} · clic sur le sol pour poser · R tourner · Échap annuler</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {cats.map((c) => (
          <button key={c} type="button" onClick={() => setTab(c)} className={`rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] ${tab === c ? "bg-brass text-ink" : "border border-ivory/20 text-ivory/75 hover:border-brass"}`}>
            {c === "mine" ? "Vos meubles" : c}
          </button>
        ))}
      </div>
      <ul className="mt-3 grid flex-1 content-start gap-1.5 overflow-y-auto pr-1">
        {tab === "mine"
          ? items.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-sm border border-ivory/10 px-2 py-1.5 text-sm">
                <span className="flex-1 font-serif">{nameOf(d)}</span>
                <button type="button" className="rounded-sm border border-ivory/20 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.15em] hover:border-brass" onClick={() => useWorld.getState().set({ editSel: { mode: "move", id: d.id } })}>
                  Déplacer
                </button>
                <button type="button" className="rounded-sm border border-ivory/20 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.15em] hover:border-[#e0503a]" onClick={() => sell(d)}>
                  Vendre
                </button>
              </li>
            ))
          : CATALOG.filter((c) => c.cat === tab).map((c) => {
              const locked = (c.rank ?? 0) > rank;
              const tooExpensive = c.price > cash;
              const active = sel?.mode === "new" && sel.type === c.type && (sel.v ?? 0) === (c.v ?? 0);
              return (
                <li key={`${c.type}-${c.v ?? 0}`}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => useWorld.getState().set({ editSel: { mode: "new", type: c.type, v: c.v } })}
                    className={`flex w-full items-baseline gap-2 rounded-sm border px-3 py-2 text-left text-sm transition ${active ? "border-brass bg-brass/15" : "border-ivory/12 hover:border-brass/70"} disabled:opacity-40`}
                  >
                    <span className="flex-1 font-serif">{c.name}</span>
                    <span className={`font-sans text-xs tabular-nums ${tooExpensive ? "text-[#e0806a]" : "text-brass-light"}`}>{locked ? "Rang supérieur" : money(c.price)}</span>
                  </button>
                </li>
              );
            })}
      </ul>
      {sel && <p className="mt-2 text-xs text-ivory/70">{sel.mode === "move" ? "Déplacement" : "Nouveau meuble"} : cliquez dans le bureau pour poser.</p>}
    </div>
  );
}

export function WorldOverlay() {
  const active = useWorld((s) => s.active);
  const edit = useWorld((s) => s.edit);
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[36] font-sans">
      {!edit && <Hud />}
      {!edit && <Objective />}
      <Toast />
      {!edit && <PromptKey />}
      <Menu />
      {!edit && <Help />}
      {!edit && <TouchControls />}
      <EditButton />
      <EditPanel />
    </div>
  );
}
