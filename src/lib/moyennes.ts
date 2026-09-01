import type { Note, EpreuveSimulee } from '../types'

export interface Moyenne {
  valeur: number | null
  totalCoefficients: number
  nombreNotes: number
}

/** Moyenne pondérée, notes ramenées sur 20 si le barème diffère. */
export function moyennePonderee(notes: Note[]): Moyenne {
  const valides = notes.filter((n) => n.bareme > 0 && n.coefficient > 0)
  const totalCoefficients = valides.reduce((s, n) => s + n.coefficient, 0)
  if (!totalCoefficients) return { valeur: null, totalCoefficients: 0, nombreNotes: valides.length }
  const somme = valides.reduce((s, n) => s + (n.valeur / n.bareme) * 20 * n.coefficient, 0)
  return {
    valeur: Math.round((somme / totalCoefficients) * 100) / 100,
    totalCoefficients,
    nombreNotes: valides.length,
  }
}

/** Moyenne générale : moyenne de matière pondérée par le coefficient d'épreuve. */
export function moyenneGenerale(
  notes: Note[],
  coefficientParCode: Record<string, number>,
): Moyenne {
  const codes = [...new Set(notes.map((n) => n.code))]
  let somme = 0
  let poids = 0
  let compte = 0
  for (const code of codes) {
    const m = moyennePonderee(notes.filter((n) => n.code === code))
    if (m.valeur === null) continue
    const coef = coefficientParCode[code] ?? 1
    if (coef <= 0) continue
    somme += m.valeur * coef
    poids += coef
    compte += m.nombreNotes
  }
  if (!poids) return { valeur: null, totalCoefficients: 0, nombreNotes: 0 }
  return {
    valeur: Math.round((somme / poids) * 100) / 100,
    totalCoefficients: poids,
    nombreNotes: compte,
  }
}

export function moyenneSimulee(epreuves: EpreuveSimulee[]): Moyenne {
  const notees = epreuves.filter((e) => e.note !== null && e.coefficient > 0)
  const poids = notees.reduce((s, e) => s + e.coefficient, 0)
  if (!poids) return { valeur: null, totalCoefficients: 0, nombreNotes: 0 }
  const somme = notees.reduce((s, e) => s + (e.note as number) * e.coefficient, 0)
  return {
    valeur: Math.round((somme / poids) * 100) / 100,
    totalCoefficients: poids,
    nombreNotes: notees.length,
  }
}

export function mention(moyenne: number | null): string | null {
  if (moyenne === null) return null
  if (moyenne >= 16) return 'Très bien'
  if (moyenne >= 14) return 'Bien'
  if (moyenne >= 12) return 'Assez bien'
  if (moyenne >= 10) return 'Admis'
  return 'Sous la barre'
}
