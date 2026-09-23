"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { hubBus } from "../state";

/** Cadre commun des vues du bureau : titre, bouton Retour, Échap pour fermer, focus initial. */
export function Shell({ kicker, title, children, className = "", align = "center" }: { kicker: string; title: string; children: ReactNode; className?: string; align?: "center" | "bottom" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && hubBus.emit({ type: "close" });
    window.addEventListener("keydown", key);
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>("button, [tabindex]")?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", key);
      window.clearTimeout(t);
    };
  }, []);
  return (
    <div className={`pointer-events-none fixed inset-0 z-[45] flex justify-center px-3 ${align === "bottom" ? "items-end pb-[2vh]" : "items-center"}`}>
      <div ref={ref} role="dialog" aria-label={title} className={`pointer-events-auto animate-hotspot-in font-sans text-ivory ${className}`}>
        <div className="mb-2 flex items-end justify-between gap-6">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.35em] text-brass/80">{kicker}</p>
            <h2 className="font-serif text-xl text-ivory sm:text-2xl">{title}</h2>
          </div>
          <button type="button" onClick={() => hubBus.emit({ type: "close" })} className="rounded-full border border-brass/40 px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.3em] text-ivory/80 hover:border-brass hover:text-brass-light focus-visible:border-brass focus-visible:outline-none">
            Retour · Échap
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Soon({ children }: { children: ReactNode }) {
  return <p className="rounded-sm border border-dashed border-ivory/20 px-3 py-2 text-xs text-ivory/60">{children}</p>;
}
