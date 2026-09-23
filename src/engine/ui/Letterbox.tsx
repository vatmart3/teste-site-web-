"use client";
import { useUi } from "../state/ui";

/** Bandes noires 2,35:1 qui se ferment pendant les cinématiques. */
export function Letterbox() {
  const on = useUi((s) => s.letterbox);
  const bar = "min(18vh, max(0px, calc((100dvh - 100vw / 2.35) / 2)))";
  const cls = "pointer-events-none fixed inset-x-0 z-30 bg-black transition-transform duration-[900ms] ease-[cubic-bezier(.65,0,.35,1)]";
  return (
    <>
      <div aria-hidden className={`${cls} top-0`} style={{ height: bar, transform: on ? "translateY(0)" : "translateY(-100%)" }} />
      <div aria-hidden className={`${cls} bottom-0`} style={{ height: bar, transform: on ? "translateY(0)" : "translateY(100%)" }} />
    </>
  );
}
