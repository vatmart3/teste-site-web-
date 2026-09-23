"use client";
/** Le registre des visiteurs : le joueur écrit son nom et choisit sa photo de badge (effet de dotation). */
import { useEffect, useRef, useState } from "react";
import { audio } from "../audio/AudioEngine";
import { panelBus } from "../director/events";
import { AVATAR_COUNT, avatarUrl } from "../props/avatars";
import { normalizeName, useProfile } from "../state/profile";

export interface IdentityResult {
  firstName: string;
  lastName: string;
  avatar: number;
}

export function IdentityForm() {
  const profile = useProfile();
  const [first, setFirst] = useState(profile.firstName);
  const [last, setLast] = useState(profile.lastName);
  const [avatar, setAvatar] = useState(profile.avatar >= 0 ? profile.avatar : 0);
  const [urls, setUrls] = useState<string[]>([]);
  const [shown, setShown] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([-1, ...Array.from({ length: AVATAR_COUNT }, (_, i) => i)].map(avatarUrl)).then((u) => alive && setUrls(u));
    const t = window.setTimeout(() => {
      setShown(true);
      firstRef.current?.focus();
    }, 50);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  const valid = normalizeName(first).length > 0;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    void audio.sfx("sfx-stamp", { volume: 0.5 });
    panelBus.emit({ firstName: normalizeName(first), lastName: normalizeName(last), avatar } satisfies IdentityResult);
  };
  const typeSound = () => void audio.sfx("sfx-typewriter-soft", { volume: 0.25, rate: 0.8 + Math.random() * 0.4 });

  return (
    <div className="fixed inset-0 z-[45] grid place-items-center bg-black/40 px-4">
      <form
        onSubmit={submit}
        aria-label="Registre des visiteurs"
        className={`paper w-full max-w-md rotate-[-1.2deg] px-7 py-6 text-[#2a2118] shadow-[0_30px_80px_rgba(0,0,0,0.6)] transition duration-700 ${shown ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
      >
        <p className="font-sans text-[0.65rem] uppercase tracking-[0.35em] text-[#8a6a26]">Harlow &amp; Vance · Sécurité</p>
        <h2 className="mt-1 font-serif text-3xl">Registre des visiteurs</h2>
        <p className="mt-1 font-serif text-sm italic text-[#5a4a38]">Nouveaux collaborateurs — émission de badge</p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <label className="block font-sans text-[0.7rem] uppercase tracking-[0.2em] text-[#6b5a44]">
            Prénom
            <input
              ref={firstRef}
              value={first}
              onChange={(e) => (setFirst(e.target.value), typeSound())}
              maxLength={24}
              autoComplete="given-name"
              required
              className="mt-1 block w-full border-0 border-b border-[#8a7a64] bg-transparent pb-1 font-serif text-2xl normal-case tracking-normal text-[#1a1a2a] outline-none focus:border-[#8a6a26]"
            />
          </label>
          <label className="block font-sans text-[0.7rem] uppercase tracking-[0.2em] text-[#6b5a44]">
            Nom
            <input
              value={last}
              onChange={(e) => (setLast(e.target.value), typeSound())}
              maxLength={24}
              autoComplete="family-name"
              className="mt-1 block w-full border-0 border-b border-[#8a7a64] bg-transparent pb-1 font-serif text-2xl normal-case tracking-normal text-[#1a1a2a] outline-none focus:border-[#8a6a26]"
            />
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="font-sans text-[0.7rem] uppercase tracking-[0.2em] text-[#6b5a44]">Photo du badge</legend>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {urls.map((u, i) => {
              const idx = i - 1;
              const on = idx === avatar;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => (setAvatar(idx), void audio.sfx("sfx-ui-hover"))}
                  aria-label={idx < 0 ? "Silhouette" : `Portrait ${idx + 1}`}
                  aria-pressed={on}
                  className={`aspect-[4/5] overflow-hidden rounded-[2px] border-2 transition ${on ? "border-[#8a6a26] shadow-[0_0_0_2px_rgba(201,162,74,0.35)]" : "border-transparent opacity-75 hover:opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex items-center justify-between">
          <p className="font-serif text-xs italic text-[#6b5a44]">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-sm bg-[#16223a] px-5 py-2 font-sans text-xs uppercase tracking-[0.25em] text-[#e7c878] transition enabled:hover:bg-[#0b1426] disabled:opacity-40"
          >
            Signer
          </button>
        </div>
      </form>
    </div>
  );
}
