"use client";

import { useEffect, useState } from "react";
import { usedToday } from "@/lib/client/quota";

type Stats = { today: number; remaining: number; quota: number };

/**
 * Le quota est réel : il est compté côté serveur par IP, et le compteur du jour
 * vient de la même source. S'il n'y a eu aucune conversion aujourd'hui, on
 * n'affiche aucun chiffre plutôt qu'un chiffre inventé.
 */
export function QuotaMeter({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [local, setLocal] = useState(0);

  useEffect(() => {
    setLocal(usedToday());
    let cancelled = false;
    fetch("/api/stats")
      .then((response) => (response.ok ? (response.json() as Promise<Stats>) : null))
      .then((value) => {
        if (!cancelled && value) setStats(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const quota = stats?.quota ?? 3;
  const remaining = stats ? Math.min(stats.remaining, Math.max(0, quota - local)) : quota - local;

  const left = Math.max(0, remaining);

  return (
    <p className="text-sm text-encre-clair">
      <span className="text-encre">
        {left} sur {quota}
      </span>{" "}
      conversion{quota > 1 ? "s" : ""} gratuite{quota > 1 ? "s" : ""} aujourd&apos;hui
      {stats && stats.today > 0 ? (
        <span className="hidden sm:inline">
          {" · "}
          {stats.today} cours converti{stats.today > 1 ? "s" : ""} ici aujourd&apos;hui
        </span>
      ) : null}
    </p>
  );
}
