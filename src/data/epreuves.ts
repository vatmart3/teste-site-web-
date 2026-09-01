export interface Epreuve {
  id: string
  code: string
  intitule: string
  coefficient: number
  forme: string
  codesMatiere: string[]
}

/**
 * Coefficients pré-remplis. INDICATIFS : le référentiel du BTS CG a été modifié
 * en 2024 — à confirmer avec le lycée. Tout est éditable dans le simulateur.
 */
export const EPREUVES_PAR_DEFAUT: Epreuve[] = [
  { id: 'e11', code: 'E1.1', intitule: 'Culture générale et expression', coefficient: 4, forme: 'Écrit — 4 h', codesMatiere: ['CGE'] },
  { id: 'e12', code: 'E1.2', intitule: 'Langue vivante étrangère — Anglais', coefficient: 3, forme: 'CCF — écrit et oral', codesMatiere: ['LV1'] },
  { id: 'e2', code: 'E2', intitule: 'Mathématiques appliquées', coefficient: 3, forme: 'CCF', codesMatiere: ['MATHS'] },
  { id: 'e3', code: 'E3', intitule: 'Culture économique, juridique et managériale', coefficient: 6, forme: 'Écrit — 4 h', codesMatiere: ['CEJM'] },
  { id: 'e41', code: 'E4.1', intitule: 'Étude de cas', coefficient: 9, forme: 'Écrit — 4 h', codesMatiere: ['P1', 'P2', 'P7'] },
  { id: 'e42', code: 'E4.2', intitule: 'Pratiques comptables, fiscales et sociales', coefficient: 4, forme: 'Écrit — 3 h', codesMatiere: ['P3', 'P4'] },
  { id: 'e5', code: 'E5', intitule: 'Analyses de gestion et organisation du SI', coefficient: 5, forme: 'Écrit — 4 h', codesMatiere: ['P5', 'P6'] },
  { id: 'e6', code: 'E6', intitule: 'Parcours de professionnalisation', coefficient: 5, forme: 'Oral — 30 min', codesMatiere: ['ATELIERS'] },
]

export const AVERTISSEMENT_COEFFICIENTS =
  "Coefficients indicatifs, saisis d'après la grille usuelle du BTS CG (total 39). " +
  'Le référentiel a été modifié en 2024 : confirme-les avec le secrétariat du lycée ' +
  'ou ton professeur principal avant de t’en servir pour arbitrer tes révisions.'
