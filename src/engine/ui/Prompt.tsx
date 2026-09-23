"use client";
import { useUi } from "../state/ui";

export function Prompt() {
  const prompt = useUi((s) => s.prompt);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4vh] z-40 flex justify-center">
      <p
        className={`font-sans text-[0.8rem] uppercase tracking-[0.3em] text-ivory/80 transition-opacity duration-700 ${prompt ? "opacity-100" : "opacity-0"}`}
        aria-live="polite"
      >
        {prompt}
      </p>
    </div>
  );
}
