import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import planningJson from '../data/planning.json'
import matieresJson from '../data/matieres.json'
import { EPREUVES_PAR_DEFAUT } from '../data/epreuves'
import type { Creneau, Devoir, EpreuveSimulee, Note, Planning, RegistreMatieres } from '../types'

const PLANNING = planningJson as unknown as Planning
const MATIERES = matieresJson as unknown as RegistreMatieres

function id(): string {
  return Math.random().toString(36).slice(2, 10)
}

export interface EtatRegistre {
  /** Créneaux : initialisés depuis planning.json, éditables dans le site. */
  creneaux: Creneau[]
  notes: Note[]
  devoirs: Devoir[]
  blocNotes: Record<string, string>
  chapitresFaits: Record<string, string[]>
  revisions: Record<string, string>
  epreuves: EpreuveSimulee[]
  dateExamen: string
  /** Semestre et quinzaine en cours — pilotent le filtrage des créneaux. */
  semestre: 1 | 2
  quinzaine: 'Q1' | 'Q2'
  /** Version du jeu de créneaux embarqué : permet de resynchroniser. */
  versionPlanning: number

  ajouterCreneau: (c: Omit<Creneau, 'id'>) => void
  modifierCreneau: (id: string, c: Partial<Creneau>) => void
  supprimerCreneau: (id: string) => void
  reinitialiserPlanning: () => void

  ajouterNote: (n: Omit<Note, 'id'>) => void
  supprimerNote: (id: string) => void

  ajouterDevoir: (d: Omit<Devoir, 'id' | 'fait' | 'creeLe'>) => void
  basculerDevoir: (id: string) => void
  supprimerDevoir: (id: string) => void

  ecrireBlocNotes: (code: string, texte: string) => void
  basculerChapitre: (code: string, chapitre: string) => void
  marquerRevision: (code: string) => void

  modifierEpreuve: (id: string, e: Partial<EpreuveSimulee>) => void
  ajouterEpreuve: () => void
  supprimerEpreuve: (id: string) => void
  reinitialiserEpreuves: () => void
  definirDateExamen: (iso: string) => void
  definirPeriode: (semestre: 1 | 2, quinzaine: 'Q1' | 'Q2') => void
}

const VERSION_PLANNING = 1

const epreuvesInitiales = (): EpreuveSimulee[] =>
  EPREUVES_PAR_DEFAUT.map((e) => ({ ...e, note: null }))

export const useRegistre = create<EtatRegistre>()(
  persist(
    (set) => ({
      creneaux: PLANNING.creneaux,
      notes: [],
      devoirs: [],
      blocNotes: {},
      chapitresFaits: {},
      revisions: {},
      epreuves: epreuvesInitiales(),
      dateExamen: '2027-05-11',
      semestre: 1,
      quinzaine: 'Q1',
      versionPlanning: VERSION_PLANNING,

      ajouterCreneau: (c) => set((s) => ({ creneaux: [...s.creneaux, { ...c, id: id() }] })),
      modifierCreneau: (cid, patch) =>
        set((s) => ({ creneaux: s.creneaux.map((c) => (c.id === cid ? { ...c, ...patch } : c)) })),
      supprimerCreneau: (cid) => set((s) => ({ creneaux: s.creneaux.filter((c) => c.id !== cid) })),
      reinitialiserPlanning: () =>
        set({ creneaux: PLANNING.creneaux, versionPlanning: VERSION_PLANNING }),

      ajouterNote: (n) => set((s) => ({ notes: [...s.notes, { ...n, id: id() }] })),
      supprimerNote: (nid) => set((s) => ({ notes: s.notes.filter((n) => n.id !== nid) })),

      ajouterDevoir: (d) =>
        set((s) => ({
          devoirs: [
            ...s.devoirs,
            { ...d, id: id(), fait: false, creeLe: new Date().toISOString().slice(0, 10) },
          ],
        })),
      basculerDevoir: (did) =>
        set((s) => ({ devoirs: s.devoirs.map((d) => (d.id === did ? { ...d, fait: !d.fait } : d)) })),
      supprimerDevoir: (did) => set((s) => ({ devoirs: s.devoirs.filter((d) => d.id !== did) })),

      ecrireBlocNotes: (code, texte) => set((s) => ({ blocNotes: { ...s.blocNotes, [code]: texte } })),
      basculerChapitre: (code, chapitre) =>
        set((s) => {
          const actuels = s.chapitresFaits[code] ?? []
          const suivants = actuels.includes(chapitre)
            ? actuels.filter((c) => c !== chapitre)
            : [...actuels, chapitre]
          return { chapitresFaits: { ...s.chapitresFaits, [code]: suivants } }
        }),
      marquerRevision: (code) =>
        set((s) => ({
          revisions: { ...s.revisions, [code]: new Date().toISOString().slice(0, 10) },
        })),

      modifierEpreuve: (eid, patch) =>
        set((s) => ({ epreuves: s.epreuves.map((e) => (e.id === eid ? { ...e, ...patch } : e)) })),
      ajouterEpreuve: () =>
        set((s) => ({
          epreuves: [
            ...s.epreuves,
            {
              id: id(),
              code: 'E?',
              intitule: 'Nouvelle épreuve',
              coefficient: 1,
              forme: '',
              codesMatiere: [],
              note: null,
            },
          ],
        })),
      supprimerEpreuve: (eid) => set((s) => ({ epreuves: s.epreuves.filter((e) => e.id !== eid) })),
      reinitialiserEpreuves: () => set({ epreuves: epreuvesInitiales() }),
      definirDateExamen: (iso) => set({ dateExamen: iso }),
      definirPeriode: (semestre, quinzaine) => set({ semestre, quinzaine }),
    }),
    {
      name: 'registre-bts-cg',
      version: 2,
      migrate: (etat) => etat as EtatRegistre,
    },
  ),
)

export const MATIERES_REGISTRE = MATIERES
export const META_PLANNING = PLANNING.meta
