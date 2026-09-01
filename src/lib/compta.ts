/** Calculs métier du BTS CG. Aucun état, aucun DOM : testable et réutilisable. */

export const TAUX_TVA = [20, 10, 5.5, 2.1] as const
export type TauxTva = (typeof TAUX_TVA)[number]

export function arrondi(n: number, decimales = 2): number {
  const f = 10 ** decimales
  return Math.round((n + Number.EPSILON) * f) / f
}

export function formatEuro(n: number, decimales = 2): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

/** Décimal à la française : séparateur virgule, décimales fixes. */
export function formatDecimal(n: number, decimales = 2): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

export function formatPourcent(n: number, decimales = 2): string {
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} %`
}

// ── TVA ───────────────────────────────────────────────────────────────────

export interface ResultatTva {
  ht: number
  tva: number
  ttc: number
}

export function depuisHt(ht: number, taux: number): ResultatTva {
  const t = arrondi(ht * (taux / 100))
  return { ht: arrondi(ht), tva: t, ttc: arrondi(ht + t) }
}

export function depuisTtc(ttc: number, taux: number): ResultatTva {
  const ht = arrondi(ttc / (1 + taux / 100))
  return { ht, tva: arrondi(ttc - ht), ttc: arrondi(ttc) }
}

export function depuisTva(tva: number, taux: number): ResultatTva {
  const ht = arrondi(tva / (taux / 100))
  return { ht, tva: arrondi(tva), ttc: arrondi(ht + tva) }
}

// ── Amortissements ────────────────────────────────────────────────────────

export type ModeAmortissement = 'lineaire' | 'degressif'

export interface LigneAmortissement {
  exercice: number
  /** yyyy-MM-dd */
  debut: string
  fin: string
  base: number
  taux: number
  jours: number
  annuite: number
  cumul: number
  vnc: number
}

export interface ParametresAmortissement {
  valeurOrigine: number
  /** yyyy-MM-dd — date de mise en service (départ du prorata en linéaire). */
  miseEnService: string
  /** yyyy-MM-dd — date d'acquisition (départ du dégressif, au 1er du mois). */
  acquisition: string
  dureeAnnees: number
  mode: ModeAmortissement
  /** yyyy-MM-dd — clôture du premier exercice concerné. */
  clotureExercice: string
  valeurResiduelle: number
}

/** Coefficients dégressifs en vigueur (art. 39 A du CGI). */
export function coefficientDegressif(duree: number): number {
  if (duree <= 2) return 0
  if (duree <= 4) return 1.25
  if (duree <= 6) return 1.75
  return 2.25
}

function jours(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

function iso(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

/**
 * Plan d'amortissement complet.
 * — Linéaire : prorata temporis au jour près à partir de la mise en service
 *   (base 360 jours, convention comptable française : mois de 30 jours).
 * — Dégressif : prorata en mois entiers depuis le 1er du mois d'acquisition,
 *   bascule en linéaire dès que le taux linéaire résiduel devient supérieur.
 */
export function planAmortissement(p: ParametresAmortissement): LigneAmortissement[] {
  const base = arrondi(p.valeurOrigine - p.valeurResiduelle)
  if (!(base > 0) || !(p.dureeAnnees > 0)) return []

  const cloture = d(p.clotureExercice)
  const finMois = cloture.getMonth()
  const finJour = cloture.getDate()

  const depart = p.mode === 'lineaire' ? d(p.miseEnService) : premierDuMois(d(p.acquisition))
  const tauxLineaire = 100 / p.dureeAnnees
  const coef = coefficientDegressif(p.dureeAnnees)
  const tauxDegressif = arrondi(tauxLineaire * coef, 4)

  const lignes: LigneAmortissement[] = []
  let cumul = 0
  let vnc = base
  let debutExercice = depart
  let n = 0

  // Sécurité : au plus durée + 2 exercices (le prorata décale d'un exercice).
  const maxLignes = Math.ceil(p.dureeAnnees) + 2

  while (vnc > 0.005 && n < maxLignes) {
    const finExercice = prochaineCloture(debutExercice, finMois, finJour)
    const anneesRestantes = p.dureeAnnees - n
    let taux: number
    let annuite: number
    let joursAmortis = 360

    if (p.mode === 'lineaire') {
      taux = arrondi(tauxLineaire, 4)
      if (n === 0) {
        joursAmortis = joursCommerciaux(depart, finExercice)
        annuite = arrondi((base * taux) / 100 / 360 * joursAmortis)
      } else {
        annuite = arrondi((base * taux) / 100)
      }
    } else {
      const tauxLineaireResiduel = anneesRestantes > 0 ? 100 / anneesRestantes : 100
      const bascule = tauxLineaireResiduel >= tauxDegressif
      taux = arrondi(bascule ? tauxLineaireResiduel : tauxDegressif, 4)
      if (n === 0) {
        const mois = moisEntiers(depart, finExercice)
        joursAmortis = mois * 30
        annuite = arrondi((vnc * taux) / 100 / 12 * mois)
      } else {
        annuite = arrondi((vnc * taux) / 100)
      }
    }

    if (annuite > vnc) annuite = arrondi(vnc)

    // La colonne « jours » reflète la fraction réellement amortie sur l'exercice.
    const annuitePleine = p.mode === 'lineaire' ? (base * taux) / 100 : (vnc * taux) / 100
    if (annuitePleine > 0) {
      joursAmortis = Math.min(360, Math.round((annuite / annuitePleine) * 360))
    }

    cumul = arrondi(cumul + annuite)
    vnc = arrondi(base - cumul)

    lignes.push({
      exercice: finExercice.getFullYear(),
      debut: iso(debutExercice),
      fin: iso(finExercice),
      base: p.mode === 'lineaire' ? base : arrondi(base - (cumul - annuite)),
      taux,
      jours: joursAmortis,
      annuite,
      cumul,
      vnc: arrondi(vnc + p.valeurResiduelle),
    })

    debutExercice = new Date(finExercice)
    debutExercice.setDate(debutExercice.getDate() + 1)
    n += 1
  }

  return lignes
}

function premierDuMois(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function prochaineCloture(depuis: Date, mois: number, jour: number): Date {
  const candidat = new Date(depuis.getFullYear(), mois, jour)
  if (candidat.getTime() < depuis.getTime()) candidat.setFullYear(candidat.getFullYear() + 1)
  return candidat
}

/** Nombre de jours en base commerciale 30/360, borne de fin incluse. */
export function joursCommerciaux(debut: Date, fin: Date): number {
  const j1 = Math.min(debut.getDate(), 30)
  const j2 = Math.min(fin.getDate(), 30)
  const total = (fin.getFullYear() - debut.getFullYear()) * 360 + (fin.getMonth() - debut.getMonth()) * 30 + (j2 - j1) + 1
  return Math.max(0, Math.min(360, total))
}

export function moisEntiers(debut: Date, fin: Date): number {
  const m = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1
  return Math.max(0, Math.min(12, m))
}

export function joursEntre(debut: string, fin: string): number {
  return jours(d(debut), d(fin))
}

// ── Calculs commerciaux ───────────────────────────────────────────────────

export interface Reduction {
  id: string
  type: 'remise' | 'rabais' | 'ristourne'
  taux: number
}

export interface ResultatCommercial {
  brut: number
  etapes: { libelle: string; taux: number; montant: number; reste: number }[]
  netCommercial: number
  escompteMontant: number
  netFinancier: number
}

export function cascadeReductions(
  brut: number,
  reductions: Reduction[],
  tauxEscompte: number,
): ResultatCommercial {
  let reste = arrondi(brut)
  const etapes: ResultatCommercial['etapes'] = []
  for (const r of reductions) {
    const montant = arrondi(reste * (r.taux / 100))
    reste = arrondi(reste - montant)
    etapes.push({
      libelle: `${r.type[0].toUpperCase()}${r.type.slice(1)} ${r.taux} %`,
      taux: r.taux,
      montant,
      reste,
    })
  }
  const escompteMontant = arrondi(reste * (tauxEscompte / 100))
  return {
    brut: arrondi(brut),
    etapes,
    netCommercial: reste,
    escompteMontant,
    netFinancier: arrondi(reste - escompteMontant),
  }
}

export interface ResultatMarge {
  margeCommerciale: number
  tauxDeMarge: number
  tauxDeMarque: number
  coefficientMultiplicateur: number
}

/** prixVente et coutAchat en HT. */
export function marges(prixVenteHt: number, coutAchatHt: number, tauxTva = 20): ResultatMarge {
  const marge = arrondi(prixVenteHt - coutAchatHt)
  return {
    margeCommerciale: marge,
    tauxDeMarge: coutAchatHt ? arrondi((marge / coutAchatHt) * 100) : NaN,
    tauxDeMarque: prixVenteHt ? arrondi((marge / prixVenteHt) * 100) : NaN,
    coefficientMultiplicateur: coutAchatHt
      ? arrondi((prixVenteHt * (1 + tauxTva / 100)) / coutAchatHt, 4)
      : NaN,
  }
}

// ── Seuil de rentabilité ──────────────────────────────────────────────────

export interface ResultatSeuil {
  chiffreAffaires: number
  chargesVariables: number
  chargesFixes: number
  margeCoutVariable: number
  tauxMcv: number
  seuilEuros: number
  seuilQuantites: number | null
  pointMortJours: number
  margeSecurite: number
  indiceSecurite: number
  levierOperationnel: number
  resultat: number
}

export function seuilRentabilite(
  chiffreAffaires: number,
  chargesVariables: number,
  chargesFixes: number,
  prixUnitaire?: number,
): ResultatSeuil {
  const mcv = arrondi(chiffreAffaires - chargesVariables)
  const tauxMcv = chiffreAffaires ? mcv / chiffreAffaires : 0
  const seuilEuros = tauxMcv ? arrondi(chargesFixes / tauxMcv) : NaN
  const resultat = arrondi(mcv - chargesFixes)
  const margeSecurite = arrondi(chiffreAffaires - seuilEuros)
  return {
    chiffreAffaires: arrondi(chiffreAffaires),
    chargesVariables: arrondi(chargesVariables),
    chargesFixes: arrondi(chargesFixes),
    margeCoutVariable: mcv,
    tauxMcv: arrondi(tauxMcv * 100),
    seuilEuros,
    seuilQuantites: prixUnitaire ? Math.ceil(seuilEuros / prixUnitaire) : null,
    pointMortJours: chiffreAffaires ? arrondi((seuilEuros / chiffreAffaires) * 360, 1) : NaN,
    margeSecurite,
    indiceSecurite: chiffreAffaires ? arrondi((margeSecurite / chiffreAffaires) * 100) : NaN,
    levierOperationnel: resultat ? arrondi(mcv / resultat, 2) : NaN,
    resultat,
  }
}

/** Convertit un nombre de jours d'activité (base 360) en date dans l'année. */
export function datePointMort(jours360: number, annee: number): string {
  if (!Number.isFinite(jours360)) return '—'
  const mois = Math.min(11, Math.floor(jours360 / 30))
  const jour = Math.max(1, Math.min(30, Math.round(jours360 - mois * 30)))
  return new Date(annee, mois, jour).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
  })
}
