import type { Creneau, Devoir, Jour, Matiere, Note } from '../types'
import { enMinutes, jourDeLaDate, minutesDeLaDate, isoAujourdhui, JOURS } from './temps'
import { moyennePonderee } from './moyennes'

export interface EtatCours {
  creneau: Creneau
  ecouleMinutes: number
  restantMinutes: number
  avancement: number
}

/** Un créneau est-il actif pour la période (semestre / quinzaine) en cours ? */
export function creneauActif(c: Creneau, semestre: 1 | 2, quinzaine: 'Q1' | 'Q2'): boolean {
  if (c.semestre !== null && c.semestre !== semestre) return false
  if (c.quinzaine !== null && c.quinzaine !== quinzaine) return false
  return true
}

export function creneauxDuJour(
  creneaux: Creneau[],
  jour: Jour,
  semestre: 1 | 2,
  quinzaine: 'Q1' | 'Q2',
): Creneau[] {
  return creneaux
    .filter((c) => c.jour === jour && creneauActif(c, semestre, quinzaine))
    .sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut) || a.matiere.localeCompare(b.matiere))
}

export function coursEnCours(
  creneaux: Creneau[],
  maintenant: Date,
  semestre: 1 | 2,
  quinzaine: 'Q1' | 'Q2',
): EtatCours | null {
  const jour = jourDeLaDate(maintenant)
  if (!jour) return null
  const m = minutesDeLaDate(maintenant)
  const candidat = creneauxDuJour(creneaux, jour, semestre, quinzaine).find(
    (c) => m >= enMinutes(c.debut) && m < enMinutes(c.fin),
  )
  if (!candidat) return null
  const debut = enMinutes(candidat.debut)
  const fin = enMinutes(candidat.fin)
  return {
    creneau: candidat,
    ecouleMinutes: m - debut,
    restantMinutes: fin - m,
    avancement: (m - debut) / (fin - debut),
  }
}

/** Prochain cours : dans la journée, sinon le premier des jours suivants. */
export function prochainCours(
  creneaux: Creneau[],
  maintenant: Date,
  semestre: 1 | 2,
  quinzaine: 'Q1' | 'Q2',
): { creneau: Creneau; jour: Jour; memeJour: boolean } | null {
  const jourActuel = jourDeLaDate(maintenant)
  const m = minutesDeLaDate(maintenant)
  const indexDepart = jourActuel ? JOURS.indexOf(jourActuel) : 0

  if (jourActuel) {
    const suite = creneauxDuJour(creneaux, jourActuel, semestre, quinzaine).find(
      (c) => enMinutes(c.debut) > m,
    )
    if (suite) return { creneau: suite, jour: jourActuel, memeJour: true }
  }

  for (let d = 1; d <= 7; d += 1) {
    const jour = JOURS[(indexDepart + d) % JOURS.length]
    const liste = creneauxDuJour(creneaux, jour, semestre, quinzaine)
    if (liste.length) return { creneau: liste[0], jour, memeJour: false }
  }
  return null
}

export interface DevoirClasse extends Devoir {
  joursRestants: number
  enRetard: boolean
  pourAujourdhui: boolean
}

export function classerDevoirs(devoirs: Devoir[], maintenant = new Date()): DevoirClasse[] {
  const aujourdhui = isoAujourdhui(maintenant)
  return devoirs
    .map((d) => {
      const delta = Math.round(
        (new Date(`${d.echeance}T00:00:00`).getTime() -
          new Date(`${aujourdhui}T00:00:00`).getTime()) /
          86400000,
      )
      return {
        ...d,
        joursRestants: delta,
        enRetard: !d.fait && delta < 0,
        pourAujourdhui: !d.fait && delta === 0,
      }
    })
    .sort((a, b) => Number(a.fait) - Number(b.fait) || a.joursRestants - b.joursRestants)
}

export interface EtatMatiere {
  matiere: Matiere
  moyenne: number | null
  nombreNotes: number
  chapitresFaits: number
  chapitresTotal: number
  derniereRevision: string | null
  joursSansRevision: number | null
  devoirsOuverts: number
  devoirsEnRetard: number
}

export function etatDesMatieres(
  matieres: Matiere[],
  notes: Note[],
  devoirs: DevoirClasse[],
  chapitresFaits: Record<string, string[]>,
  revisions: Record<string, string>,
  maintenant = new Date(),
): EtatMatiere[] {
  return matieres.map((matiere) => {
    const sesNotes = notes.filter((n) => n.code === matiere.code)
    const m = moyennePonderee(sesNotes)
    const revision = revisions[matiere.code] ?? null
    const jours = revision
      ? Math.round(
          (new Date(`${isoAujourdhui(maintenant)}T00:00:00`).getTime() -
            new Date(`${revision}T00:00:00`).getTime()) /
            86400000,
        )
      : null
    const sesDevoirs = devoirs.filter((d) => d.code === matiere.code)
    return {
      matiere,
      moyenne: m.valeur,
      nombreNotes: m.nombreNotes,
      chapitresFaits: (chapitresFaits[matiere.code] ?? []).length,
      chapitresTotal: matiere.chapitres.length,
      derniereRevision: revision,
      joursSansRevision: jours,
      devoirsOuverts: sesDevoirs.filter((d) => !d.fait).length,
      devoirsEnRetard: sesDevoirs.filter((d) => d.enRetard).length,
    }
  })
}

/**
 * La matière la moins révisée : d'abord celles jamais ouvertes, puis la plus
 * ancienne. On ignore l'accompagnement personnalisé (pas d'épreuve).
 */
export function matiereLaMoinsRevisee(etats: EtatMatiere[]): EtatMatiere | null {
  const candidats = etats.filter((e) => e.matiere.epreuve !== null)
  if (!candidats.length) return null
  const jamais = candidats.filter((e) => e.derniereRevision === null)
  if (jamais.length) {
    return [...jamais].sort(
      (a, b) =>
        b.chapitresTotal - b.chapitresFaits - (a.chapitresTotal - a.chapitresFaits) ||
        b.matiere.coefficient - a.matiere.coefficient,
    )[0]
  }
  return [...candidats].sort((a, b) => (b.joursSansRevision ?? 0) - (a.joursSansRevision ?? 0))[0]
}

/** La phrase d'accueil : quoi faire là, maintenant. */
export function consigneDuMoment(args: {
  cours: EtatCours | null
  suivant: { creneau: Creneau; jour: Jour; memeJour: boolean } | null
  devoirs: DevoirClasse[]
  moinsRevisee: EtatMatiere | null
  joursAvantExamen: number
}): string {
  const retards = args.devoirs.filter((d) => d.enRetard)
  if (retards.length) {
    const d = retards[0]
    return retards.length === 1
      ? `Tu as ${Math.abs(d.joursRestants)} jour${Math.abs(d.joursRestants) > 1 ? 's' : ''} de retard sur « ${d.intitule} ». Fais-le avant tout le reste.`
      : `${retards.length} devoirs sont en retard. Commence par « ${d.intitule} », c'est le plus ancien.`
  }
  const pourAujourdhui = args.devoirs.filter((d) => d.pourAujourdhui)
  if (pourAujourdhui.length) {
    return `« ${pourAujourdhui[0].intitule} » est à rendre aujourd'hui${pourAujourdhui.length > 1 ? ` (et ${pourAujourdhui.length - 1} autre${pourAujourdhui.length > 2 ? 's' : ''})` : ''}.`
  }
  if (args.cours) {
    const c = args.cours.creneau
    return `Tu es en ${c.matiere}${c.salle ? ` en ${c.salle}` : ''}. Il reste ${args.cours.restantMinutes} min : prends tes notes proprement, tu les repasseras ce soir.`
  }
  if (args.suivant?.memeJour) {
    return `Prochain cours : ${args.suivant.creneau.matiere} à ${args.suivant.creneau.debut.replace(':', 'h')}${args.suivant.creneau.salle ? ` en ${args.suivant.creneau.salle}` : ''}. D'ici là, tu as le temps d'une fiche.`
  }
  if (args.moinsRevisee) {
    const e = args.moinsRevisee
    const quand =
      e.joursSansRevision === null
        ? "n'a jamais été ouverte depuis que tu tiens ce registre"
        : `n'a pas été rouverte depuis ${e.joursSansRevision} jour${e.joursSansRevision > 1 ? 's' : ''}`
    return `Plus de cours aujourd'hui. ${e.matiere.nom} ${quand} — c'est elle qu'il faut reprendre maintenant.`
  }
  return `Plus rien au programme aujourd'hui. Il reste ${args.joursAvantExamen} jours avant l'examen : ouvre une fiche.`
}
