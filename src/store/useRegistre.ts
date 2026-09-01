import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import planningJson from '../data/planning.json'
import matieresJson from '../data/matieres.json'
import { DATE_EXAMEN_PAR_DEFAUT, EPREUVES_PAR_DEFAUT } from '../data/epreuves'
import type {
  Creneau,
  Devoir,
  EpreuveSimulee,
  Note,
  Planning,
  RegistreMatieres,
  Seance,
} from '../types'

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
  /** Séances de travail chronométrées, par matière. */
  seances: Seance[]
  dateExamen: string
  /** Minutes d'avance du rappel avant un cours. */
  rappelMinutes: number
  /** Notifications système demandées par l'utilisateur. */
  rappelsSysteme: boolean
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

  enregistrerSeance: (code: string, debut: string, duree: number) => void
  definirRappelMinutes: (minutes: number) => void
  definirRappelsSysteme: (actif: boolean) => void
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
      seances: [],
      dateExamen: DATE_EXAMEN_PAR_DEFAUT,
      rappelMinutes: 10,
      rappelsSysteme: false,
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

      enregistrerSeance: (code, debut, duree) =>
        set((s) =>
          duree < 1 ? s : { seances: [...s.seances, { id: id(), code, debut, duree }] },
        ),
      definirRappelMinutes: (minutes) => set({ rappelMinutes: minutes }),
      definirRappelsSysteme: (actif) => set({ rappelsSysteme: actif }),
    }),
    {
      name: 'registre-bts-cg',
      version: 3,
      migrate: (etat, versionPrecedente) => {
        const e = etat as Partial<EtatRegistre>
        // v3 : ajout des séances et des rappels ; l'examen passe à mai 2028
        // (session confirmée par la page Notion « KIT DE SURVIE BTS CG »).
        if (versionPrecedente < 3) {
          return {
            ...e,
            seances: e.seances ?? [],
            rappelMinutes: e.rappelMinutes ?? 10,
            rappelsSysteme: e.rappelsSysteme ?? false,
            dateExamen:
              !e.dateExamen || e.dateExamen.startsWith('2027') ? DATE_EXAMEN_PAR_DEFAUT : e.dateExamen,
            epreuves: epreuvesInitiales(),
          } as EtatRegistre
        }
        return etat as EtatRegistre
      },
    },
  ),
)

export const MATIERES_REGISTRE = MATIERES
export const META_PLANNING = PLANNING.meta
