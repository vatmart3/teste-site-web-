"use client";
import { useEffect, useState } from "react";
import { newYorkTime } from "@/lib/time";
import { formatDollars, nextRankProgress, rankFor } from "../../career/ranks";
import { displayName, useProfile, type RelationId } from "../../state/profile";
import { CHARACTERS } from "@/content/characters";
import { Shell, Soon } from "./Shell";

type App = "profile" | "ranking" | "daily";

function relationLabel(v: number) {
  if (v <= -30) return "Hostile";
  if (v < -5) return "Méfiant";
  if (v <= 5) return "Neutre";
  if (v < 30) return "Bienveillant";
  return "Allié";
}

/** « H&V Terminal » : l'OS fictif du cabinet (profil, classement, dossier du jour). */
export function TerminalView() {
  const p = useProfile();
  const [app, setApp] = useState<App>("profile");
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setBooted(true), 650);
    return () => window.clearTimeout(t);
  }, []);
  const rank = rankFor(p.reputation);
  const next = nextRankProgress(p.reputation);
  return (
    <Shell kicker={`H&V Terminal v4.2 · ${newYorkTime().digital} (New York)`} title={displayName(p) || "Session"} className="w-[min(46rem,95vw)]">
      <div className="overflow-hidden rounded-md border border-[#2a4a7a] bg-[#07142a] font-mono text-[#cfe0ff] shadow-[0_0_60px_rgba(60,120,255,0.25)]">
        {!booted ? (
          <p className="p-6 text-sm">Connexion sécurisée au réseau Harlow &amp; Vance…</p>
        ) : (
          <div className="flex min-h-[20rem] flex-col sm:flex-row">
            <nav className="flex gap-1 border-b border-[#1c355e] bg-[#0a1b36] p-2 text-xs sm:w-44 sm:flex-col sm:border-b-0 sm:border-r" aria-label="Applications">
              {(
                [
                  ["profile", "Mon dossier"],
                  ["ranking", "Classement"],
                  ["daily", "Dossier du jour"],
                ] as [App, string][]
              ).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setApp(id)} aria-pressed={app === id} className={`rounded px-2 py-1.5 text-left ${app === id ? "bg-[#1c3a6a] text-white" : "text-[#9db8e8] hover:bg-[#12284a]"}`}>
                  {label}
                </button>
              ))}
            </nav>
            <div className="flex-1 p-4 text-sm">
              {app === "profile" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[#7f9fd0]">Rang</p>
                    <p className="text-lg text-white">{rank.title}</p>
                    {next && (
                      <div className="mt-1">
                        <div className="h-2 overflow-hidden rounded bg-[#12284a]">
                          <div className="h-full bg-[#c9a24a]" style={{ width: `${next.progress * 100}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-[#7f9fd0]">
                          {p.reputation} pts de réputation · encore {next.missing} pour « {next.next.title} »
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[#7f9fd0]">Honoraires facturés</p>
                      <p className="text-lg text-white">{formatDollars(p.billed)}</p>
                    </div>
                    <div>
                      <p className="text-[#7f9fd0]">Intégrité</p>
                      <div className="mt-1 h-2 overflow-hidden rounded bg-[#12284a]">
                        <div className="h-full" style={{ width: `${p.integrity}%`, background: p.integrity > 60 ? "#4fbf7a" : p.integrity > 30 ? "#d9a441" : "#d9534f" }} />
                      </div>
                      <p className="mt-1 text-xs text-[#7f9fd0]">{p.integrity} / 100</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[#7f9fd0]">Relations</p>
                    <ul className="mt-1 space-y-1">
                      {(Object.keys(p.relations) as RelationId[]).map((id) => (
                        <li key={id} className="flex items-center gap-2 text-xs">
                          <span className="w-28 text-white">{CHARACTERS[id].name}</span>
                          <span className="relative h-1.5 flex-1 rounded bg-[#12284a]">
                            <span className="absolute top-0 h-full bg-[#c9a24a]" style={{ left: `${50 + Math.min(0, p.relations[id]) / 2}%`, width: `${Math.abs(p.relations[id]) / 2}%` }} />
                            <span className="absolute left-1/2 top-[-2px] h-[10px] w-px bg-[#7f9fd0]" />
                          </span>
                          <span className="w-20 text-right text-[#9db8e8]">{relationLabel(p.relations[id])}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {app === "ranking" && (
                <div className="space-y-3">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[#7f9fd0]">
                      <tr>
                        <th className="py-1">#</th>
                        <th>Collaborateur</th>
                        <th className="text-right">Réputation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-white">
                        <td className="py-1">—</td>
                        <td>{displayName(p) || "Vous"}</td>
                        <td className="text-right">{p.reputation}</td>
                      </tr>
                    </tbody>
                  </table>
                  <Soon>Le classement entre joueurs ouvre avec les comptes (livraison 8). Aucun chiffre n&apos;est inventé ici.</Soon>
                </div>
              )}
              {app === "daily" && <Soon>Le Dossier du jour (une énigme courte chaque jour, avec série et classement) arrive en livraison 8.</Soon>}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
