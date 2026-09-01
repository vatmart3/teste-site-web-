/**
 * Enregistrement d'un fichier généré (CSV du plan d'amortissement,
 * planning.json), quel que soit l'endroit où le site est ouvert.
 *
 * Deux chemins, dans cet ordre :
 *  1. Page publiée comme Artifact claude.ai — le visualiseur bloque les liens
 *     de téléchargement ; on passe par la capacité « downloads », qui demande
 *     confirmation au lecteur.
 *  2. Partout ailleurs (Vercel, GitHub Pages, fichier local, npm run dev) —
 *     lien de téléchargement classique sur une URL blob.
 */

export type ResultatTelechargement = 'enregistre' | 'refuse' | 'indisponible'

interface CapaciteDownloads {
  save: (requete: { filename: string; data: string | Blob }) => Promise<{ status: 'saved' }>
}

interface FenetreClaude {
  claude?: { use?: (nom: string) => Promise<unknown> }
}

async function capaciteDownloads(): Promise<CapaciteDownloads | null> {
  const use = (window as unknown as FenetreClaude).claude?.use
  if (typeof use !== 'function') return null
  try {
    return ((await use('downloads')) as CapaciteDownloads | null) ?? null
  } catch {
    return null
  }
}

function lienClassique(nomFichier: string, contenu: string, typeMime: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([contenu], { type: typeMime }))
    const a = document.createElement('a')
    a.href = url
    a.download = nomFichier
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

export async function telecharger(
  nomFichier: string,
  contenu: string,
  typeMime: string,
): Promise<ResultatTelechargement> {
  const downloads = await capaciteDownloads()
  if (downloads) {
    try {
      await downloads.save({ filename: nomFichier, data: contenu })
      return 'enregistre'
    } catch (erreur) {
      const code = (erreur as { code?: string } | null)?.code
      // « declined » : le lecteur a refusé, ce n'est pas une panne.
      return code === 'declined' ? 'refuse' : 'indisponible'
    }
  }
  return lienClassique(nomFichier, contenu, typeMime) ? 'enregistre' : 'indisponible'
}

export function messageTelechargement(r: ResultatTelechargement, nomFichier: string): string {
  if (r === 'enregistre') return `${nomFichier} enregistré.`
  if (r === 'refuse') return 'Enregistrement annulé.'
  return `Impossible d'enregistrer ${nomFichier} ici — copie le contenu à la place.`
}
