import {
  differenceInCalendarDays,
  format,
  getISOWeek,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Jour } from '../types'

export const JOURS: Jour[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** "HH:MM" -> minutes depuis minuit. */
export function enMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** minutes depuis minuit -> "8h00". */
export function formatHeure(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${String(m).padStart(2, '0')}`
}

/** minutes -> "1 h 55" / "45 min". */
export function formatDuree(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')}`
}

/** 0 = lundi … 5 = samedi ; null le dimanche. */
export function jourDeLaDate(d: Date): Jour | null {
  const i = (d.getDay() + 6) % 7
  return i <= 5 ? JOURS[i] : null
}

export function minutesDeLaDate(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** Numéro de semaine ISO 8601 — sert à déterminer la quinzaine Q1/Q2. */
export function semaineIso(d: Date): number {
  return getISOWeek(d)
}

/** Date du lundi de la semaine contenant `d`. */
export function lundiDeLaSemaine(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 })
}

export function memeJour(a: Date, b: Date): boolean {
  return isSameDay(a, b)
}

export function joursRestants(cible: string, depuis = new Date()): number {
  return differenceInCalendarDays(parseISO(cible), depuis)
}

export function isoAujourdhui(d = new Date()): string {
  return format(d, 'yyyy-MM-dd')
}

export function formatDateCourte(iso: string): string {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return iso
  return format(d, 'dd MMM', { locale: fr })
}

export function formatDateLongue(d: Date): string {
  return format(d, 'EEEE d MMMM', { locale: fr })
}

export function formatDateHeure(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return format(d, "d MMM 'à' HH:mm", { locale: fr })
}
