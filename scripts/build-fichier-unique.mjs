#!/usr/bin/env node
/**
 * Assemble le site en un seul fichier HTML autonome : CSS et JavaScript sont
 * intégrés en ligne, aucune ressource externe hormis les polices Google.
 *
 * Sert à deux choses :
 *  - publier le site comme page unique (Artifact Claude, partage direct) ;
 *  - garder une copie hors ligne ouvrable d'un double-clic.
 *
 * Deux variantes sont produites dans dist-fichier/ :
 *  - registre.html          document complet, ouvrable tel quel
 *  - registre-fragment.html sans <!doctype>/<html>/<head>/<body>, pour les
 *                           hébergeurs qui fournissent eux-mêmes l'enveloppe
 *
 *   npm run build:fichier
 */

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SORTIE = resolve(RACINE, 'dist-fichier')

const POLICES =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Karla:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">'

/** Un `</script>` littéral dans le bundle refermerait la balise. */
const echapper = (js) => js.replace(/<\/script/gi, '<\\/script')

const fichiers = await readdir(SORTIE).catch(() => [])
const nomCss = fichiers.find((f) => f.endsWith('.css'))
const nomJs = fichiers.find((f) => f.endsWith('.js'))
if (!nomCss || !nomJs) {
  console.error('Bundle introuvable. Lance d’abord : vite build --mode fichier')
  process.exit(1)
}

const css = await readFile(resolve(SORTIE, nomCss), 'utf8')
const js = await readFile(resolve(SORTIE, nomJs), 'utf8')

const corps = [
  '<title>Registre BTS</title>',
  POLICES,
  `<style>\n${css}\n</style>`,
  '<div id="root"></div>',
  `<script type="module">\n${echapper(js)}\n</script>`,
].join('\n')

const complet = [
  '<!doctype html>',
  '<html lang="fr">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
  '<meta name="theme-color" content="#10231C">',
  corps,
  '</head>',
  '<body></body>',
  '</html>',
].join('\n')

await writeFile(resolve(SORTIE, 'registre.html'), complet, 'utf8')
await writeFile(resolve(SORTIE, 'registre-fragment.html'), corps, 'utf8')

const ko = (t) => `${Math.round(t.length / 1024)} ko`
console.log(`dist-fichier/registre.html           ${ko(complet)}`)
console.log(`dist-fichier/registre-fragment.html  ${ko(corps)}`)
