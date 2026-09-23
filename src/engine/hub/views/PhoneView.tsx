"use client";
import { useState } from "react";
import { inbox } from "@/content/messages";
import { useProfile } from "../../state/profile";
import { hubBus } from "../state";
import { Shell } from "./Shell";

/** Téléphone de bureau : messages vocaux (lus avec sous-titres) et SMS. */
export function PhoneView() {
  const profile = useProfile();
  const list = inbox({ flags: profile.flags, arrivalSeen: profile.arrivalSeen });
  const [open, setOpen] = useState<string | null>(null);
  const opened = list.find((m) => m.id === open);
  return (
    <Shell kicker="Poste 5214" title="Messagerie" className="hub-panel w-[min(34rem,94vw)] rounded-md p-5">
      <ul className="divide-y divide-ivory/10">
        {list.map((m) => {
          const unread = !profile.readMessages.includes(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  if (m.kind === "voicemail") hubBus.emit({ type: "play", messageId: m.id });
                  else {
                    setOpen(open === m.id ? null : m.id);
                    profile.markRead(m.id);
                  }
                }}
                className="flex w-full items-center gap-3 py-3 text-left hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${unread ? "bg-[#ff4a3a] shadow-[0_0_8px_#ff4a3a]" : "bg-transparent"}`} aria-label={unread ? "non lu" : undefined} />
                <span className="w-6 text-center text-lg" aria-hidden>
                  {m.kind === "voicemail" ? "☏" : "✉"}
                </span>
                <span className="flex-1">
                  <span className="block text-sm text-ivory">{m.from}</span>
                  <span className="block truncate text-xs text-ivory/55">{m.kind === "voicemail" ? `Message vocal · ${m.duration}` : m.text}</span>
                </span>
                <span className="text-xs text-ivory/40">{m.time}</span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="py-4 text-sm text-ivory/60">Aucun message.</li>}
      </ul>
      {opened && opened.kind === "sms" && (
        <div className="mt-3 rounded-md bg-white/5 p-3">
          <p className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/50">{opened.from}</p>
          <p className="mt-1 max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1f2a40] px-3 py-2 text-sm">{opened.text}</p>
        </div>
      )}
    </Shell>
  );
}
