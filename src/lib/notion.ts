/**
 * Lecture du contenu Notion.
 *
 * Deux sources, dans cet ordre :
 *  1. En direct — quand la page est publiée comme Artifact claude.ai et que le
 *     connecteur Notion du lecteur est disponible, on appelle réellement
 *     `notion-fetch` : le contenu affiché est celui de Notion à la seconde.
 *  2. Le miroir local — `src/data/matieres.json`, écrit lors de la création
 *     des pages. Il sert partout ailleurs (GitHub Pages, Vercel, hors ligne).
 */

export type BlocNotion =
  | { t: 'titre'; texte: string }
  | { t: 'callout'; icone: string; ton: 'info' | 'alerte' | 'note'; texte: string }
  | { t: 'toggle'; texte: string }
  | { t: 'todo'; texte: string; fait: boolean }
  | { t: 'liste'; texte: string }
  | { t: 'table'; lignes: string[][] }
  | { t: 'texte'; texte: string }

export type CodeErreurNotion =
  | 'indisponible'
  | 'needs_reauth'
  | 'server_not_connected'
  | 'selection_required'
  | 'autre'

export interface ResultatNotion {
  blocs: BlocNotion[]
  /** Horodatage du résultat servi par le cache, s'il vient du cache. */
  cacheDe: number | null
}

interface CapaciteMcp {
  callTool: (
    server: string,
    tool: string,
    input?: unknown,
    options?: unknown,
  ) => Promise<{ payload?: unknown; cache?: { storedAt?: number } }>
}

interface FenetreClaude {
  claude?: { use?: (nom: string) => Promise<unknown> }
}

export async function capaciteMcp(): Promise<CapaciteMcp | null> {
  const use = (window as unknown as FenetreClaude).claude?.use
  if (typeof use !== 'function') return null
  try {
    return ((await use('mcp')) as CapaciteMcp | null) ?? null
  } catch {
    return null
  }
}

/** Lit une page Notion en direct. Rejette avec un code d'erreur exploitable. */
export async function lirePageNotion(pageId: string): Promise<ResultatNotion> {
  const mcp = await capaciteMcp()
  if (!mcp) throw { code: 'indisponible' as CodeErreurNotion }

  let resultat
  try {
    resultat = await mcp.callTool('Notion', 'notion-fetch', { id: pageId })
  } catch (erreur) {
    const brut = (erreur as { code?: string } | null)?.code
    const code: CodeErreurNotion =
      brut === 'needs_reauth' || brut === 'server_not_connected' || brut === 'selection_required'
        ? brut
        : brut === 'not_granted' || brut === 'capability_disabled' || brut === 'capability_removed'
          ? 'indisponible'
          : 'autre'
    throw { code, message: (erreur as { message?: string } | null)?.message }
  }

  const payload = resultat.payload as { text?: string } | string | undefined
  const texte = typeof payload === 'string' ? payload : (payload?.text ?? '')
  if (!texte) throw { code: 'autre' as CodeErreurNotion, message: 'Réponse Notion vide.' }

  return { blocs: analyser(texte), cacheDe: resultat.cache?.storedAt ?? null }
}

/**
 * Analyse le Markdown enrichi de Notion. On ne couvre que les blocs que nos
 * pages de matière utilisent : callouts, titres, toggles, cases à cocher,
 * tables. Le reste retombe en paragraphe.
 */
export function analyser(source: string): BlocNotion[] {
  // On ne garde que l'intérieur de <content>…</content> quand il est présent.
  const contenu = source.match(/<content>([\s\S]*?)<\/content>/)
  const corps = contenu ? contenu[1] : source

  const blocs: BlocNotion[] = []
  const lignes = corps.split('\n')
  let i = 0

  const nettoyer = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]+>/g, '')
      .trim()

  while (i < lignes.length) {
    const ligne = lignes[i]
    const nu = ligne.trim()

    if (!nu || nu === '<empty-block/>') {
      i += 1
      continue
    }

    const callout = nu.match(/^<callout(?:\s+icon="([^"]*)")?(?:\s+color="([^"]*)")?\s*>/)
    if (callout) {
      const morceaux: string[] = []
      i += 1
      while (i < lignes.length && !lignes[i].trim().startsWith('</callout>')) {
        const t = nettoyer(lignes[i])
        if (t) morceaux.push(t)
        i += 1
      }
      i += 1
      const couleur = callout[2] ?? ''
      blocs.push({
        t: 'callout',
        icone: callout[1] ?? '',
        ton: couleur.startsWith('red') ? 'alerte' : couleur.startsWith('yellow') ? 'note' : 'info',
        texte: morceaux.join(' '),
      })
      continue
    }

    if (nu.startsWith('<details')) {
      i += 1
      let titre = ''
      while (i < lignes.length && !lignes[i].trim().startsWith('</details>')) {
        const som = lignes[i].match(/<summary>([\s\S]*?)<\/summary>/)
        if (som) titre = nettoyer(som[1])
        i += 1
      }
      i += 1
      if (titre) blocs.push({ t: 'toggle', texte: titre })
      continue
    }

    if (nu.startsWith('<table')) {
      const rangees: string[][] = []
      i += 1
      let courante: string[] | null = null
      while (i < lignes.length && !lignes[i].trim().startsWith('</table>')) {
        const l = lignes[i].trim()
        if (l.startsWith('<tr')) courante = []
        else if (l.startsWith('</tr>')) {
          if (courante) rangees.push(courante)
          courante = null
        } else {
          const cellule = l.match(/<td[^>]*>([\s\S]*?)<\/td>/)
          if (cellule && courante) courante.push(nettoyer(cellule[1]))
        }
        i += 1
      }
      i += 1
      if (rangees.length) blocs.push({ t: 'table', lignes: rangees })
      continue
    }

    const titre = nu.match(/^#{1,4}\s+(.*)$/)
    if (titre) {
      blocs.push({ t: 'titre', texte: nettoyer(titre[1]) })
      i += 1
      continue
    }

    const todo = nu.match(/^-\s\[( |x|X)\]\s+(.*)$/)
    if (todo) {
      blocs.push({ t: 'todo', texte: nettoyer(todo[2]), fait: todo[1].toLowerCase() === 'x' })
      i += 1
      continue
    }

    const puce = nu.match(/^[-*]\s+(.*)$/)
    if (puce) {
      blocs.push({ t: 'liste', texte: nettoyer(puce[1]) })
      i += 1
      continue
    }

    if (nu.startsWith('<')) {
      i += 1
      continue
    }

    const texte = nettoyer(nu)
    if (texte) blocs.push({ t: 'texte', texte })
    i += 1
  }

  return blocs
}

/** Reconstruit les blocs à partir du miroir local, pour un rendu identique. */
export function blocsDuMiroir(m: {
  objectif: string
  chapitres: string[]
  ecritures: [string, string, string][]
  aFaire: string[]
  erreurs: string
}): BlocNotion[] {
  const blocs: BlocNotion[] = [{ t: 'callout', icone: '🎯', ton: 'info', texte: m.objectif }]
  if (m.chapitres.length) {
    blocs.push({ t: 'titre', texte: 'Programme' })
    m.chapitres.forEach((c) => blocs.push({ t: 'toggle', texte: c }))
  }
  if (m.ecritures.length) {
    blocs.push({ t: 'titre', texte: 'Écritures & mécanismes clés' })
    blocs.push({ t: 'table', lignes: [['Situation', 'Débit', 'Crédit'], ...m.ecritures] })
  }
  if (m.aFaire.length) {
    blocs.push({ t: 'titre', texte: 'Exercices & annales' })
    m.aFaire.forEach((a) => blocs.push({ t: 'todo', texte: a, fait: false }))
  }
  blocs.push({ t: 'titre', texte: 'Erreurs que je refais tout le temps' })
  blocs.push({ t: 'callout', icone: '⚠️', ton: 'alerte', texte: m.erreurs })
  return blocs
}

export function messageErreurNotion(code: CodeErreurNotion): string {
  switch (code) {
    case 'needs_reauth':
      return 'Ta connexion Notion a expiré. Reconnecte-la dans claude.ai → Réglages → Connecteurs.'
    case 'server_not_connected':
      return 'Le connecteur Notion n’est pas actif ici. Ajoute-le dans claude.ai → Réglages → Connecteurs.'
    case 'selection_required':
      return 'Plusieurs connecteurs Notion sont disponibles : choisis-en un quand claude.ai te le demande.'
    case 'indisponible':
      return 'Lecture directe de Notion indisponible sur cette adresse.'
    default:
      return 'Notion n’a pas répondu. Le contenu affiché est la copie locale.'
  }
}
