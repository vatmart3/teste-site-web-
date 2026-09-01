export type Jour = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi'

export type Quinzaine = 'Q1' | 'Q2'

export interface Creneau {
  id: string
  jour: Jour
  /** "HH:MM" */
  debut: string
  /** "HH:MM" */
  fin: string
  code: string
  matiere: string
  professeur: string | null
  salle: string | null
  groupe: string | null
  semestre: 1 | 2 | null
  quinzaine: Quinzaine | null
}

export interface MetaPlanning {
  eleve: string
  etablissement: string
  classe: string
  groupeTd: string
  source: string
  jours: Jour[]
  amplitude: { debut: string; fin: string }
  bornes: string[]
}

export interface Planning {
  meta: MetaPlanning
  creneaux: Creneau[]
}

export interface Matiere {
  code: string
  nom: string
  /** Libellé compact, utilisé dans les blocs de la grille horaire. */
  nomCourt: string
  intituleOfficiel: string
  professeur: string | null
  /** Épreuves du BTS où la matière est évaluée (E1 → E8). */
  epreuves: string[]
  coefficient: number
  objectif: string
  /** Couleur de la matière, en hexadécimal. Sert partout dans l'interface. */
  couleur: string
  icone: string
  notionPageId: string | null
  notionUrl: string | null
  chapitres: string[]
  /** Table Situation / Débit / Crédit, miroir de la page Notion. */
  ecritures: [situation: string, debit: string, credit: string][]
  aFaire: string[]
  erreurs: string
}

export interface LienNotion {
  titre: string
  url: string
}

export interface RegistreMatieres {
  genereLe: string | null
  notion: {
    databaseId: string | null
    databaseUrl: string | null
    pageParente: LienNotion | null
    kitDeSurvie: LienNotion | null
  }
  matieres: Matiere[]
}

/** Une séance de travail chronométrée sur une matière. */
export interface Seance {
  id: string
  code: string
  /** ISO */
  debut: string
  /** minutes */
  duree: number
}

export interface Note {
  id: string
  code: string
  intitule: string
  valeur: number
  bareme: number
  coefficient: number
  /** ISO yyyy-MM-dd */
  date: string
}

export interface Devoir {
  id: string
  code: string
  intitule: string
  /** ISO yyyy-MM-dd */
  echeance: string
  fait: boolean
  creeLe: string
}

export interface EpreuveSimulee {
  id: string
  code: string
  intitule: string
  coefficient: number
  forme: string
  codesMatiere: string[]
  note: number | null
}
