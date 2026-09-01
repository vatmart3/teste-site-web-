import type { Creneau, Jour } from '../types'
import { enMinutes, jourDeLaDate, minutesDeLaDate } from './temps'
import { creneauxDuJour } from './selection'

export interface Rappel {
  creneau: Creneau
  /** Minutes avant le début. Négatif si le cours a déjà commencé. */
  dans: number
  imminent: boolean
  enCours: boolean
}

/**
 * Le cours à signaler maintenant : celui qui est en train de se dérouler,
 * sinon le prochain de la journée s'il commence dans la fenêtre de rappel.
 */
export function rappelCourant(
  creneaux: Creneau[],
  maintenant: Date,
  semestre: 1 | 2,
  quinzaine: 'Q1' | 'Q2',
  fenetreMinutes: number,
): Rappel | null {
  const jour = jourDeLaDate(maintenant)
  if (!jour) return null
  const m = minutesDeLaDate(maintenant)
  const duJour = creneauxDuJour(creneaux, jour, semestre, quinzaine)

  const enCours = duJour.find((c) => m >= enMinutes(c.debut) && m < enMinutes(c.fin))
  if (enCours) {
    return { creneau: enCours, dans: enMinutes(enCours.debut) - m, imminent: false, enCours: true }
  }

  const suivant = duJour.find((c) => enMinutes(c.debut) > m)
  if (!suivant) return null
  const dans = enMinutes(suivant.debut) - m
  if (dans > Math.max(fenetreMinutes, 30)) return null
  return { creneau: suivant, dans, imminent: dans <= fenetreMinutes, enCours: false }
}

/** Prochain cours, tous jours confondus, pour la ligne permanente. */
export function prochainAffiche(
  creneaux: Creneau[],
  maintenant: Date,
  semestre: 1 | 2,
  quinzaine: 'Q1' | 'Q2',
): { creneau: Creneau; jour: Jour; dans: number | null } | null {
  const jourActuel = jourDeLaDate(maintenant)
  const m = minutesDeLaDate(maintenant)
  if (jourActuel) {
    const suite = creneauxDuJour(creneaux, jourActuel, semestre, quinzaine).find(
      (c) => enMinutes(c.debut) > m,
    )
    if (suite) return { creneau: suite, jour: jourActuel, dans: enMinutes(suite.debut) - m }
  }
  const JOURS: Jour[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const depart = jourActuel ? JOURS.indexOf(jourActuel) : -1
  for (let d = 1; d <= 7; d += 1) {
    const jour = JOURS[(depart + d + JOURS.length) % JOURS.length]
    const liste = creneauxDuJour(creneaux, jour, semestre, quinzaine)
    if (liste.length) return { creneau: liste[0], jour, dans: null }
  }
  return null
}

export type EtatNotifications = 'indisponible' | 'refusee' | 'a-demander' | 'active'

export function etatNotifications(): EtatNotifications {
  if (typeof Notification === 'undefined') return 'indisponible'
  if (Notification.permission === 'granted') return 'active'
  if (Notification.permission === 'denied') return 'refusee'
  return 'a-demander'
}

export async function demanderNotifications(): Promise<EtatNotifications> {
  if (typeof Notification === 'undefined') return 'indisponible'
  if (Notification.permission === 'granted') return 'active'
  try {
    const reponse = await Notification.requestPermission()
    return reponse === 'granted' ? 'active' : reponse === 'denied' ? 'refusee' : 'a-demander'
  } catch {
    return 'indisponible'
  }
}

export function notifier(titre: string, corps: string, tag: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(titre, { body: corps, tag, icon: '/icone.svg', lang: 'fr' })
  } catch {
    // Certains navigateurs exigent un service worker : on ignore silencieusement.
  }
}
