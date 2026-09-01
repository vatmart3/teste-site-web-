export interface Epreuve {
  id: string
  code: string
  intitule: string
  coefficient: number
  forme: string
  codesMatiere: string[]
}

/**
 * Épreuves du BTS CG, référentiel 2024 (numérotation E1 → E8).
 *
 * Les épreuves 5 à 8 — leur forme, leur durée, leur coefficient et les
 * processus couverts — sont reprises telles quelles de la page Notion
 * « KIT DE SURVIE BTS CG » de Jérémy. Les coefficients de E1 à E4 suivent la
 * grille usuelle (total 39) et restent à confirmer avec le lycée.
 */
export const EPREUVES_PAR_DEFAUT: Epreuve[] = [
  { id: 'e1', code: 'E1', intitule: 'Culture générale et expression', coefficient: 4, forme: 'Écrit', codesMatiere: ['CGE'] },
  { id: 'e2', code: 'E2', intitule: 'Anglais', coefficient: 3, forme: 'CCF — écrit et oral', codesMatiere: ['LV1'] },
  { id: 'e3', code: 'E3', intitule: 'Mathématiques appliquées', coefficient: 3, forme: 'CCF', codesMatiere: ['MATHS'] },
  { id: 'e4', code: 'E4', intitule: 'Culture économique, juridique et managériale', coefficient: 6, forme: 'Écrit', codesMatiere: ['CEJM'] },
  {
    id: 'e5',
    code: 'E5',
    intitule: 'Étude de cas comptable, social et fiscal',
    coefficient: 9,
    forme: 'Écrit 4 h 30 — mai 2028',
    codesMatiere: ['P1', 'P2', 'P3', 'P4', 'P7'],
  },
  {
    id: 'e6',
    code: 'E6',
    intitule: 'Pratique comptable, fiscale et sociale',
    coefficient: 4,
    forme: 'CCF 14 pts + oral 20 min sur 6 pts — PGI EBP',
    codesMatiere: ['P1', 'P2', 'P3', 'P4', 'P7'],
  },
  {
    id: 'e7',
    code: 'E7',
    intitule: 'Contrôle de gestion et analyse financière',
    coefficient: 5,
    forme: 'CCF 14 pts + oral 20 min sur 6 pts — sur Excel',
    codesMatiere: ['P5', 'P6', 'P7'],
  },
  {
    id: 'e8',
    code: 'E8',
    intitule: 'Parcours de professionnalisation',
    coefficient: 5,
    forme: 'Écrit professionnel + oral 30 min — mai 2028',
    codesMatiere: ['ATELIERS', 'P1', 'P2', 'P3', 'P4', 'P7'],
  },
]

/** Ce que l'oral de l'épreuve 8 attend, d'après le KIT DE SURVIE. */
export const DETAIL_E8 = [
  "15 min sur l'écrit professionnel : 10 pages d'analyse d'un processus comptable — enchaînement, avantages et inconvénients, ce que le cabinet fait bien, freins et obstacles, pistes d'amélioration. Schématiser le processus.",
  'Dans ces 15 min également : la veille informationnelle — définition, application dans l’organisation, outils et sources, précautions et conseils.',
  '15 min sur le passeport professionnel : la validation des compétences sur les deux années, avec les attestations de stage.',
]

export const AVERTISSEMENT_COEFFICIENTS =
  'Épreuves 5 à 8 reprises de ta page Notion « KIT DE SURVIE BTS CG ». ' +
  'Les coefficients de E1 à E4 suivent la grille usuelle (total 39) et restent à confirmer avec le lycée.'

/** Session d'examen : mai 2028, d'après le KIT DE SURVIE. */
export const DATE_EXAMEN_PAR_DEFAUT = '2028-05-15'
