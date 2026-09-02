import type { Conversion } from "./schemas";

/**
 * Cache mémoire, clé = SHA-256 du lot de fichiers. Reconvertir le même cours est
 * instantané et ne coûte pas un appel modèle. En mémoire seulement : une instance
 * qui redémarre repart d'un cache vide, ce qui est acceptable en phase 1.
 */
const MAX_ENTRIES = 200;
const TTL_MS = 1000 * 60 * 60 * 12;

type Entry = { value: Conversion; at: number };

const store = new Map<string, Entry>();

export function cacheGet(key: string): Conversion | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  // LRU : on remet l'entrée en tête
  store.delete(key);
  store.set(key, hit);
  return hit.value;
}

export function cacheSet(key: string, value: Conversion): void {
  store.set(key, { value, at: Date.now() });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

/** Quota et compteur du jour, par IP. Réel, remis à zéro au redémarrage. */
const usage = new Map<string, { day: string; count: number }>();
let dayTotal = { day: "", count: 0 };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function remainingQuota(ip: string, limit: number): number {
  const entry = usage.get(ip);
  if (!entry || entry.day !== today()) return limit;
  return Math.max(0, limit - entry.count);
}

export function consumeQuota(ip: string): void {
  const day = today();
  const entry = usage.get(ip);
  if (!entry || entry.day !== day) usage.set(ip, { day, count: 1 });
  else entry.count += 1;

  if (dayTotal.day !== day) dayTotal = { day, count: 1 };
  else dayTotal.count += 1;
}

export function conversionsToday(): number {
  return dayTotal.day === today() ? dayTotal.count : 0;
}
