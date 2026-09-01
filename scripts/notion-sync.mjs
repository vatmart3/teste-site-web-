#!/usr/bin/env node
/**
 * REGISTRE — synchronisation Notion
 * ---------------------------------------------------------------------------
 * Crée (ou retrouve) la base « BTS CG — Cours » sous la page parente indiquée,
 * y crée une page par matière détectée dans src/data/planning.json, puis écrit
 * les URLs et IDs dans src/data/matieres.json.
 *
 * Le script est IDEMPOTENT : relancé, il met à jour l'existant sans jamais
 * créer de doublon. Les blocs de contenu ne sont écrits qu'à la création de la
 * page, pour ne pas écraser ce que tu as saisi à la main.
 *
 *   npm run notion:sync            synchronise
 *   npm run notion:sync:dry        montre ce qui serait fait, n'écrit rien
 *
 * Variables d'environnement (fichier .env) : NOTION_TOKEN, NOTION_PARENT_PAGE_ID
 */

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client, isFullDatabase, isFullPage } from '@notionhq/client'
import 'dotenv/config'

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = resolve(ICI, '..')
const CHEMIN_PLANNING = resolve(RACINE, 'src/data/planning.json')
const CHEMIN_MATIERES = resolve(RACINE, 'src/data/matieres.json')

const TITRE_BASE = 'BTS CG — Cours'
const CODES = ['CGE', 'LV1', 'MATHS', 'CEJM', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'ATELIERS', 'EPS', 'AP']
const STATUTS = ['À jour', 'En retard', 'À réviser']

const DRY = process.argv.includes('--dry-run')

// ── Petits utilitaires de rendu ────────────────────────────────────────────

const rt = (contenu, annotations = {}) => [
  { type: 'text', text: { content: contenu }, annotations },
]

const paragraphe = (texte) => ({
  object: 'block',
  type: 'paragraph',
  paragraph: { rich_text: texte ? rt(texte) : [] },
})

const titre2 = (texte) => ({
  object: 'block',
  type: 'heading_2',
  heading_2: { rich_text: rt(texte) },
})

const callout = (texte, emoji, couleur) => ({
  object: 'block',
  type: 'callout',
  callout: { rich_text: rt(texte), icon: { type: 'emoji', emoji }, color: couleur },
})

const toggle = (texte) => ({
  object: 'block',
  type: 'toggle',
  toggle: { rich_text: rt(texte), children: [paragraphe('')] },
})

const aCocher = (texte) => ({
  object: 'block',
  type: 'to_do',
  to_do: { rich_text: rt(texte), checked: false },
})

const separateur = () => ({ object: 'block', type: 'divider', divider: {} })

/** Tableau Situation / Débit / Crédit. */
const tableEcritures = (lignes) => ({
  object: 'block',
  type: 'table',
  table: {
    table_width: 3,
    has_column_header: true,
    has_row_header: false,
    children: [['Situation', 'Débit', 'Crédit'], ...lignes].map((cellules) => ({
      object: 'block',
      type: 'table_row',
      table_row: { cells: cellules.map((c) => (c ? rt(c) : [])) },
    })),
  },
})

/** Base de données inline enfant d'une page. */
async function creerBaseInline(notion, pageId, titre, proprietes) {
  return notion.databases.create({
    parent: { type: 'page_id', page_id: pageId },
    title: rt(titre),
    is_inline: true,
    properties: proprietes,
  })
}

// ── Contenu type d'une page matière ────────────────────────────────────────

function ecrituresCles(code) {
  const parCode = {
    P1: [
      ["Achat de marchandises (facture)", '607 · 44566', '401'],
      ['Vente de marchandises (facture)', '411', '707 · 44571'],
      ['Règlement client par virement', '512', '411'],
      ["Acceptation d'un effet par le client", '413', '411'],
      ["Remise à l'escompte", '512 · 6616 · 627 · 44566', '5114'],
      ['Escompte de règlement accordé', '665', '411'],
      ['Consignation d’emballages au client', '411', '4196'],
    ],
    P2: [
      ['Dotation aux amortissements', '6811', '28…'],
      ['Dépréciation de créance client', '6817', '491'],
      ['Passage en client douteux', '416', '411'],
      ['Créance devenue irrécouvrable', '654 · 44571', '416'],
      ['Provision pour litige', '6815', '1511'],
      ['Charge constatée d’avance', '486', '6…'],
      ['Produit constaté d’avance', '7…', '487'],
      ['Sortie de l’actif lors d’une cession', '675 · 28…', '2…'],
    ],
    P3: [
      ['TVA déductible sur achats', '44566', ''],
      ['TVA déductible sur immobilisations', '44562', ''],
      ['TVA collectée sur ventes', '', '44571'],
      ['Déclaration : TVA à décaisser', '44571', '44566 · 44562 · 44551'],
      ['Crédit de TVA à reporter', '44567', ''],
      ['Paiement de la TVA', '44551', '512'],
      ['Impôt sur les sociétés', '695', '444'],
    ],
    P4: [
      ['Salaires bruts', '641', ''],
      ['Retenues salariales', '', '431 · 437'],
      ['Prélèvement à la source', '', '4421'],
      ['Net à payer', '', '421'],
      ['Charges patronales', '645', '431 · 437'],
      ['Paiement des salaires', '421', '512'],
      ['Paiement des cotisations', '431 · 437', '512'],
      ['Provision pour congés payés', '6412', '4282'],
    ],
    P5: [
      ['Variation de stock de marchandises', '6037', '37'],
      ['Variation de stock de produits finis', '355', '7135'],
      ['Production immobilisée', '2…', '72'],
      ['Transfert de charges', '', '791'],
    ],
    P6: [
      ["Affectation du résultat — bénéfice", '120', '1061 · 1068 · 457'],
      ["Affectation du résultat — perte", '119', '129'],
      ['Distribution de dividendes', '457', '512'],
      ['Souscription d’un emprunt', '512', '164'],
      ["Échéance d'emprunt", '164 · 6611', '512'],
    ],
    P7: [
      ['Achat d’un logiciel', '205 · 44562', '404'],
      ['Écriture d’attente à régulariser', '471', '…'],
      ['Régularisation d’un compte d’attente', '…', '471'],
      ['Virement interne entre comptes', '580', '512 · 530'],
    ],
  }
  return parCode[code] ?? null
}

function blocsDePage(matiere) {
  const blocs = [
    callout(
      `${matiere.objectif}${matiere.epreuve ? ` — épreuve ${matiere.epreuve}, coefficient ${matiere.coefficient}.` : ' — pas d’épreuve terminale dédiée.'}`,
      '🎯',
      'green_background',
    ),
    separateur(),
    titre2('Programme'),
    paragraphe('Un toggle par chapitre. Ouvre-le et remplis-le au fil des cours.'),
    ...matiere.chapitres.map(toggle),
  ]

  const lignes = ecrituresCles(matiere.code)
  if (lignes) {
    blocs.push(
      separateur(),
      titre2('Écritures & mécanismes clés'),
      paragraphe('Les schémas à connaître par cœur. Complète la colonne de gauche avec tes propres cas.'),
      tableEcritures(lignes),
    )
  }

  blocs.push(
    separateur(),
    titre2('Exercices & annales'),
    aCocher('Exercices du manuel — chapitre en cours'),
    aCocher('Annale : sujet le plus récent'),
    aCocher('Annale : sujet de l’année précédente'),
    separateur(),
    titre2('Erreurs que je refais tout le temps'),
    callout(
      'Note ici, à chaud, chaque erreur relevée en devoir. Relis cette liste avant chaque évaluation — c’est la page la plus rentable du cours.',
      '⚠️',
      'red_background',
    ),
  )

  return blocs
}

// ── Recherche idempotente ──────────────────────────────────────────────────

async function trouverBase(notion, parentId) {
  const reponse = await notion.search({
    query: TITRE_BASE,
    filter: { value: 'database', property: 'object' },
    page_size: 50,
  })
  for (const r of reponse.results) {
    if (!isFullDatabase(r)) continue
    const titre = (r.title ?? []).map((t) => t.plain_text).join('')
    const memeParent = r.parent?.type === 'page_id' && normaliserId(r.parent.page_id) === normaliserId(parentId)
    if (titre === TITRE_BASE && memeParent && !r.archived) return r
  }
  return null
}

async function pagesExistantes(notion, databaseId) {
  const parCode = new Map()
  let curseur
  do {
    const reponse = await notion.databases.query({
      database_id: databaseId,
      start_cursor: curseur,
      page_size: 100,
    })
    for (const p of reponse.results) {
      if (!isFullPage(p)) continue
      const code = p.properties?.Code?.select?.name
      if (code) parCode.set(code, p)
    }
    curseur = reponse.has_more ? reponse.next_cursor : undefined
  } while (curseur)
  return parCode
}

function normaliserId(id) {
  return String(id ?? '').replace(/-/g, '').toLowerCase()
}

function proprietesMatiere(matiere) {
  const p = {
    Matière: { title: rt(matiere.nom) },
    Code: { select: { name: matiere.code } },
    Coefficient: { number: matiere.coefficient },
    Statut: { select: { name: 'À réviser' } },
  }
  if (matiere.professeur) p.Professeur = { rich_text: rt(matiere.professeur) }
  return p
}

// ── Programme principal ────────────────────────────────────────────────────

async function main() {
  const token = process.env.NOTION_TOKEN
  const parentId = process.env.NOTION_PARENT_PAGE_ID

  if (!existsSync(resolve(RACINE, '.env')) && !token) {
    console.error(
      'Aucun fichier .env trouvé. Copie .env.example en .env et renseigne NOTION_TOKEN et NOTION_PARENT_PAGE_ID.',
    )
    process.exit(1)
  }
  if (!token || !parentId) {
    console.error('NOTION_TOKEN et NOTION_PARENT_PAGE_ID sont obligatoires (voir .env.example).')
    process.exit(1)
  }

  const planning = JSON.parse(await readFile(CHEMIN_PLANNING, 'utf8'))
  const registre = JSON.parse(await readFile(CHEMIN_MATIERES, 'utf8'))

  const codesAuPlanning = [...new Set(planning.creneaux.map((c) => c.code))]
  const aSynchroniser = registre.matieres.filter((m) => codesAuPlanning.includes(m.code))
  const ignorees = registre.matieres.filter((m) => !codesAuPlanning.includes(m.code))

  console.log(`Matières détectées dans le planning : ${aSynchroniser.map((m) => m.code).join(', ')}`)
  if (ignorees.length) {
    console.log(`Non présentes au planning, ignorées : ${ignorees.map((m) => m.code).join(', ')}`)
  }

  if (DRY) {
    console.log('\n--dry-run : rien ne sera écrit dans Notion.')
    for (const m of aSynchroniser) {
      console.log(`  · ${m.code.padEnd(9)} ${m.nom} — ${m.chapitres.length} chapitres`)
    }
    return
  }

  const notion = new Client({ auth: token })

  // 1. La base de données, créée une seule fois.
  let base = await trouverBase(notion, parentId)
  if (base) {
    console.log(`Base « ${TITRE_BASE} » déjà présente (${base.id}).`)
  } else {
    console.log(`Création de la base « ${TITRE_BASE} »…`)
    base = await notion.databases.create({
      parent: { type: 'page_id', page_id: parentId },
      icon: { type: 'emoji', emoji: '📗' },
      title: rt(TITRE_BASE),
      properties: {
        Matière: { title: {} },
        Code: { select: { options: CODES.map((name) => ({ name })) } },
        Professeur: { rich_text: {} },
        Coefficient: { number: { format: 'number' } },
        Statut: { select: { options: STATUTS.map((name) => ({ name })) } },
        'Dernière révision': { date: {} },
      },
    })
    console.log(`  → créée : ${base.id}`)
  }

  const existantes = await pagesExistantes(notion, base.id)

  // 2. Une page par matière.
  for (const matiere of aSynchroniser) {
    const dejaLa = existantes.get(matiere.code)

    if (dejaLa) {
      await notion.pages.update({ page_id: dejaLa.id, properties: proprietesMatiere(matiere) })
      matiere.notionPageId = dejaLa.id
      matiere.notionUrl = dejaLa.url
      console.log(`  = ${matiere.code.padEnd(9)} page existante mise à jour`)
      continue
    }

    const page = await notion.pages.create({
      parent: { type: 'database_id', database_id: base.id },
      properties: proprietesMatiere(matiere),
      children: blocsDePage(matiere),
    })

    // Bases inline : elles doivent être créées après la page, en enfants.
    await creerBaseInline(notion, page.id, 'Fiches de révision', {
      Chapitre: { title: {} },
      Statut: {
        select: {
          options: [
            { name: 'À faire' },
            { name: 'En cours' },
            { name: 'Fiche écrite' },
            { name: 'Sue par cœur' },
          ],
        },
      },
      'Date de révision': { date: {} },
      Difficulté: {
        select: {
          options: [{ name: 'Facile' }, { name: 'Moyenne' }, { name: 'Difficile' }, { name: 'Bête noire' }],
        },
      },
    })

    await creerBaseInline(notion, page.id, 'Notes obtenues', {
      Évaluation: { title: {} },
      Note: { number: { format: 'number' } },
      Coefficient: { number: { format: 'number' } },
      Date: { date: {} },
      "Ce que j'ai raté": { rich_text: {} },
    })

    matiere.notionPageId = page.id
    matiere.notionUrl = page.url
    console.log(`  + ${matiere.code.padEnd(9)} page créée — ${page.url}`)
  }

  // 3. Réécriture de src/data/matieres.json.
  registre.genereLe = new Date().toISOString()
  registre.notion = { databaseId: base.id, databaseUrl: base.url ?? null }
  await writeFile(CHEMIN_MATIERES, `${JSON.stringify(registre, null, 2)}\n`, 'utf8')

  console.log(`\nsrc/data/matieres.json mis à jour (${aSynchroniser.length} matières liées).`)
  console.log('Recharge le site : le bouton « Ouvrir la fiche Notion » pointe désormais sur tes pages.')
}

main().catch((erreur) => {
  console.error('\nÉchec de la synchronisation Notion.')
  if (erreur?.code === 'unauthorized') {
    console.error("Le jeton est refusé. Vérifie NOTION_TOKEN, et que l'intégration est bien partagée avec la page parente.")
  } else if (erreur?.code === 'object_not_found') {
    console.error(
      "Page parente introuvable. Vérifie NOTION_PARENT_PAGE_ID, et surtout : ouvre la page dans Notion → menu ⋯ → « Connexions » → ajoute ton intégration.",
    )
  } else {
    console.error(erreur?.body ?? erreur?.message ?? erreur)
  }
  process.exit(1)
})
