"use client";

const KEY = "fiche.usage";

type Usage = { day: string; count: number };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function read(): Usage {
  if (typeof window === "undefined") return { day: today(), count: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { day: today(), count: 0 };
    const parsed = JSON.parse(raw) as Usage;
    if (parsed.day !== today()) return { day: today(), count: 0 };
    return parsed;
  } catch {
    return { day: today(), count: 0 };
  }
}

export function usedToday(): number {
  return read().count;
}

export function noteConversion(): void {
  const usage = read();
  const next = { day: today(), count: usage.count + 1 };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // navigation privée : le quota serveur prend le relais
  }
}

const EXAM_KEY = "fiche.exam";

export function readExamDate(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(EXAM_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeExamDate(value: string): void {
  try {
    if (value) window.localStorage.setItem(EXAM_KEY, value);
    else window.localStorage.removeItem(EXAM_KEY);
  } catch {
    // ignoré
  }
}

export function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}
