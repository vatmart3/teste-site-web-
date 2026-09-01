import { useEffect, useState } from 'react'
import { useRegistre, type EtatRegistre } from '../store/useRegistre'
import {
  brancherSauvegarde,
  extraire,
  libelleSauvegarde,
  type Branchement,
  type DonneesRegistre,
  type EtatSauvegarde,
} from './sauvegarde'

export function useSauvegarde(): {
  etat: EtatSauvegarde
  majLe: string | null
  libelle: string
} {
  const [etat, setEtat] = useState<EtatSauvegarde>('connexion')
  const [majLe, setMajLe] = useState<string | null>(null)

  useEffect(() => {
    let branchement: Branchement | null = null
    let annule = false

    void brancherSauvegarde({
      lire: () => useRegistre.getState(),
      ecrire: (patch) => useRegistre.setState(patch as Partial<EtatRegistre>),
      souscrire: (rappel) => useRegistre.subscribe(rappel),
      onEtat: (e, m) => {
        if (annule) return
        setEtat(e)
        setMajLe(m)
      },
    }).then((b) => {
      if (annule) b.arreter()
      else branchement = b
    })

    return () => {
      annule = true
      branchement?.arreter()
    }
  }, [])

  return { etat, majLe, libelle: libelleSauvegarde(etat) }
}

/** Le contenu du fichier de sauvegarde, prêt à télécharger. */
export function exporterDonnees(): string {
  return JSON.stringify(
    {
      application: 'Registre — BTS CG',
      exporteLe: new Date().toISOString(),
      donnees: extraire(useRegistre.getState()),
    },
    null,
    2,
  )
}

export type ResultatImport = { ok: true; champs: number } | { ok: false; message: string }

/** Relit un fichier de sauvegarde et remplace l'état. */
export function importerDonnees(texte: string): ResultatImport {
  let brut: unknown
  try {
    brut = JSON.parse(texte)
  } catch {
    return { ok: false, message: "Ce fichier n'est pas du JSON valide." }
  }
  const enveloppe = brut as { donnees?: unknown }
  const donnees = (enveloppe?.donnees ?? brut) as Partial<DonneesRegistre>
  if (!donnees || typeof donnees !== 'object') {
    return { ok: false, message: 'Fichier illisible.' }
  }
  if (!Array.isArray(donnees.creneaux) && !Array.isArray(donnees.notes)) {
    return { ok: false, message: "Ce fichier ne ressemble pas à une sauvegarde du registre." }
  }
  useRegistre.setState(donnees as Partial<EtatRegistre>)
  return { ok: true, champs: Object.keys(donnees).length }
}
