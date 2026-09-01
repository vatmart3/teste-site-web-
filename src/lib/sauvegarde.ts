/**
 * Sauvegarde des données du registre.
 *
 * Deux niveaux, empilés :
 *  1. Le navigateur — `localStorage`, toujours actif. Rapide, mais propre à
 *     un appareil : ce qui est saisi sur le téléphone n'apparaît pas sur
 *     l'ordinateur.
 *  2. La base de l'application — quand la page tourne comme Artifact
 *     claude.ai avec la capacité `db`. Les données y sont stockées côté
 *     serveur : elles suivent d'un appareil à l'autre et survivent à un
 *     vidage du cache.
 *
 * La base fait autorité quand elle est disponible. À l'ouverture on compare
 * les horodatages : la version la plus récente gagne, dans les deux sens.
 */

import type { EtatRegistre } from '../store/useRegistre'

export type EtatSauvegarde = 'locale' | 'connexion' | 'synchronise' | 'erreur'

const CHEMIN = 'registre/etat'
const DELAI_ECRITURE = 900

/** Les champs persistés. Tout le reste est dérivé et se recalcule. */
export const CHAMPS_SAUVEGARDES = [
  'creneaux',
  'notes',
  'devoirs',
  'blocNotes',
  'chapitresFaits',
  'revisions',
  'epreuves',
  'seances',
  'dateExamen',
  'semestre',
  'quinzaine',
  'rappelMinutes',
  'rappelsSysteme',
  'notionDansSafari',
  'vuePlanning',
  'versionPlanning',
] as const

export type DonneesRegistre = Pick<EtatRegistre, (typeof CHAMPS_SAUVEGARDES)[number]>

interface Instantane {
  exists: boolean
  data: () => Record<string, unknown> | undefined
  metadata: { hasPendingWrites: boolean; fromCache: boolean }
}

interface Document {
  get: () => Promise<Instantane>
  set: (donnees: Record<string, unknown>) => Promise<void>
  onSnapshot: (
    suivant: (s: Instantane) => void,
    erreur?: (e: { code: string; message: string }) => void,
  ) => () => void
}

interface BaseDeDonnees {
  doc: (chemin: string) => Document
}

interface FenetreClaude {
  claude?: { use?: (nom: string) => Promise<unknown> }
}

export function extraire(etat: EtatRegistre): DonneesRegistre {
  const sortie = {} as Record<string, unknown>
  for (const champ of CHAMPS_SAUVEGARDES) sortie[champ] = etat[champ]
  return sortie as DonneesRegistre
}

async function capaciteDb(): Promise<BaseDeDonnees | null> {
  const use = (window as unknown as FenetreClaude).claude?.use
  if (typeof use !== 'function') return null
  try {
    return ((await use('db')) as BaseDeDonnees | null) ?? null
  } catch {
    return null
  }
}

export interface Branchement {
  arreter: () => void
}

/**
 * Branche le magasin sur la base. Renvoie de quoi couper la liaison.
 * `onEtat` est appelé à chaque changement de statut, pour l'afficher.
 */
export async function brancherSauvegarde(options: {
  lire: () => EtatRegistre
  ecrire: (donnees: Partial<DonneesRegistre>) => void
  souscrire: (rappel: () => void) => () => void
  onEtat: (etat: EtatSauvegarde, majLe: string | null) => void
}): Promise<Branchement> {
  const { lire, ecrire, souscrire, onEtat } = options

  onEtat('connexion', null)
  const db = await capaciteDb()
  if (!db) {
    onEtat('locale', null)
    return { arreter: () => {} }
  }

  let ref: Document
  try {
    ref = db.doc(CHEMIN)
  } catch {
    onEtat('erreur', null)
    return { arreter: () => {} }
  }

  /** Évite la boucle : une écriture distante ne doit pas se réécrire. */
  let applicationEnCours = false
  let derniereEcriture = ''
  let minuterie: number | undefined
  let vivant = true

  const pousser = async () => {
    if (!vivant) return
    const donnees = extraire(lire())
    const majLe = new Date().toISOString()
    const charge = JSON.stringify(donnees)
    if (charge === derniereEcriture) return
    try {
      await ref.set({ ...donnees, majLe, version: 1 })
      derniereEcriture = charge
      onEtat('synchronise', majLe)
    } catch {
      onEtat('erreur', null)
    }
  }

  const appliquer = (brut: Record<string, unknown>) => {
    const patch: Partial<DonneesRegistre> = {}
    for (const champ of CHAMPS_SAUVEGARDES) {
      if (brut[champ] !== undefined) (patch as Record<string, unknown>)[champ] = brut[champ]
    }
    applicationEnCours = true
    ecrire(patch)
    derniereEcriture = JSON.stringify(extraire(lire()))
    applicationEnCours = false
  }

  // Premier échange : la version la plus récente gagne.
  try {
    const instantane = await ref.get()
    const brut = instantane.exists ? instantane.data() : undefined
    if (brut) {
      appliquer(brut)
      onEtat('synchronise', typeof brut.majLe === 'string' ? brut.majLe : null)
    } else {
      await pousser()
    }
  } catch {
    onEtat('erreur', null)
  }

  // Les écritures des autres appareils arrivent ici, en direct.
  const couperEcoute = ref.onSnapshot(
    (instantane) => {
      if (!vivant || instantane.metadata.hasPendingWrites) return
      const brut = instantane.exists ? instantane.data() : undefined
      if (!brut) return
      const charge = JSON.stringify(
        Object.fromEntries(CHAMPS_SAUVEGARDES.map((c) => [c, brut[c]])),
      )
      if (charge === derniereEcriture) return
      appliquer(brut)
      onEtat('synchronise', typeof brut.majLe === 'string' ? brut.majLe : null)
    },
    () => onEtat('erreur', null),
  )

  const couperMagasin = souscrire(() => {
    if (applicationEnCours || !vivant) return
    window.clearTimeout(minuterie)
    minuterie = window.setTimeout(() => void pousser(), DELAI_ECRITURE)
  })

  return {
    arreter: () => {
      vivant = false
      window.clearTimeout(minuterie)
      couperEcoute()
      couperMagasin()
    },
  }
}

export function libelleSauvegarde(etat: EtatSauvegarde): string {
  switch (etat) {
    case 'synchronise':
      return 'Base de l’application — tes données suivent d’un appareil à l’autre.'
    case 'connexion':
      return 'Connexion à la base…'
    case 'erreur':
      return 'La base n’a pas répondu. Tout reste enregistré dans ce navigateur.'
    default:
      return 'Ce navigateur uniquement. Les données ne suivent pas sur un autre appareil.'
  }
}
