# FICHÉ — convertisseur de cours

Tu photographies ton cours, tu récupères trois supports de révision : un résumé structuré, une carte mentale et un paquet de fiches. Sans compte, sans email, sans attendre.

Phase 1 livrée : dépôt (photo, PDF, HEIC), pipeline de conversion en streaming, les trois rendus, tous les exports, design complet et hero 3D.

---

## Installation

```bash
pnpm install
cp .env.example .env.local     # puis colle ta clé Anthropic
pnpm dev                       # http://localhost:3000
```

```bash
pnpm build       # build de production
pnpm typecheck   # TypeScript strict, aucun `any` dans src/
pnpm lint
```

Node 20 ou plus. `pnpm install` copie le worker pdf.js dans `public/` (script `postinstall`).

## Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | **Requise.** Serveur uniquement, jamais exposée au client. |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Le modèle de conversion. |
| `ANTHROPIC_EFFORT` | `low` | `low` \| `medium` \| `high` \| `xhigh` \| `max`. C'est le réglage qui tient la promesse des 20 secondes ; monte-le si tu préfères la finesse à la vitesse. |
| `FICHE_FREE_QUOTA` | `3` | Conversions gratuites par jour et par IP. |

## Déploiement

Vercel, sans configuration. `ANTHROPIC_API_KEY` en variable d'environnement du projet. La route `/api/convert` s'exécute en Node avec `maxDuration = 60`.

---

## Décisions d'architecture, une ligne chacune

**Pipeline**

- **Un seul appel modèle, multi-images, sortie JSON structurée** (`output_config.format`) plutôt que trois appels : trois appels, c'est trois latences réseau et trois lectures des mêmes images.
- **Le schéma JSON envoyé au modèle est permissif, la validation zod est stricte** : un schéma bavard ralentit le décodage contraint, alors que zod, lui, ne coûte rien après coup.
- **L'ordre des clés du schéma est l'ordre de perception** — défauts de lisibilité, résumé, carte, fiches — parce que la génération contrainte suit l'ordre déclaré, donc le résumé arrive en premier à l'écran.
- **Un parseur JSON tolérant referme les structures ouvertes à la volée** (`src/lib/partial-json.ts`) : c'est ce qui permet d'afficher le résumé pendant que le modèle écrit encore les fiches.
- **L'étape en cours est déduite du texte reçu**, pas d'un minuteur : la clé `"mindmap"` apparaît dans le flux, donc l'étape affichée est vraie.
- **`thinking` désactivé et `effort: low`** : la lecture d'un polycopié n'est pas un problème de raisonnement, et chaque seconde de réflexion est une seconde d'attente.
- **Retry unique en cas d'échec de schéma**, non streamé, avec la sortie cassée en contexte : deux essais valent mieux qu'une erreur, trois valent une éternité.
- **Route Node et non Edge** : `maxDuration = 60` couvre quinze pages, là où Edge coupe trop tôt sur un lot lourd.
- **Cache serveur en mémoire, clé SHA-256 du lot de pages** : reconvertir le même cours est instantané, gratuit, et hors quota.

**Client**

- **Tout le travail lourd se fait dans le navigateur** — HEIC → JPEG, PDF → canvas, redimensionnement à 1568 px, qualité 0,85 — pour que le serveur ne reçoive que des JPEG sous le mégaoctet.
- **pdfjs et heic2any sont chargés dynamiquement**, seulement quand un PDF ou un HEIC arrive vraiment.
- **pdf-lib et les modules d'export sont importés au clic** : le premier écran tombe à 124 ko de JS, three.js et pdf-lib compris hors chemin critique.
- **Le rendu 3D est en import dynamique et n'existe pas sous `prefers-reduced-motion`** : dans ce cas c'est un SVG statique équivalent qui s'affiche, pas une animation ralentie.
- **Une seule disposition de carte mentale, trois moteurs de rendu** (SVG, canvas, pdf-lib) qui partagent `src/lib/mindmap/layout.ts` avec des largeurs de texte estimées et non mesurées : l'export est donc au pixel près ce que l'écran affiche.
- **Le PNG de la carte est peint au canvas**, pas rastérisé depuis le SVG, parce qu'un SVG rastérisé perd les polices du document.

**Exports**

- **La planche de fiches inverse les colonnes au verso** : en recto-verso reliure bord long, la feuille se retourne autour de son axe vertical, donc le dos d'une fiche en colonne 0 tombe en colonne 1. C'est vérifiable — plie une page en deux dans le sens de la hauteur, les deux faces coïncident.
- **Polices PDF standard plutôt qu'une police embarquée** : WinAnsi couvre le français, et un translittérateur (`src/lib/export/pdf-text.ts`) traite le grec et les symboles mathématiques au lieu de faire planter l'export.
- **Le LaTeX est converti en Unicode pour l'affichage et les PDF** (`src/lib/latex.ts`), et conservé tel quel dans l'export Markdown, où il a un sens.

**Produit**

- **Le quota est compté côté serveur par IP**, pas seulement dans le navigateur : une rareté qu'on contourne en ouvrant une fenêtre privée n'est pas une rareté.
- **Le compteur de preuve sociale vient du même compteur serveur**, et disparaît quand il vaut zéro : aucun chiffre n'est inventé.
- **Aucun fichier n'est écrit sur disque**, à aucun moment : les pages sont traitées en mémoire puis jetées, et seul le résultat structuré peut être conservé — et seulement, en phase 2, pour un compte.
- **Le modèle de données de la phase 2 existe déjà** (`src/lib/data-model.ts`, `src/lib/db/schema.sql`) — comptes, historique, progression par carte, rappels J+1/J+3/J+7, liens de partage, abonnements Stripe — pour que la phase 1 n'ait pas à être défaite ensuite.

---

## La règle produit qui prime sur tout, après la vitesse

Le modèle n'invente jamais de contenu de cours. Le prompt système en fait sa première contrainte, le schéma prévoit un champ `pageIssues`, et l'interface affiche le résultat tel quel : « Page 3 — photo floue sur le tiers bas. Reprends-la à plat, avec la lumière derrière toi. » Un résumé court et exact vaut mieux qu'un résumé complet et faux, et un étudiant qui découvre à l'examen que sa fiche était inventée ne revient jamais.

## Ce que la phase 1 ne fait pas

Comptes, historique, liens de partage, rappels de révision, envoi vers Notion et paiement Stripe sont la phase 2. Le bouton « Garder mes fiches » le dit franchement au lieu d'ouvrir un formulaire qui ne mène nulle part, et il propose les exports, qui, eux, existent.

## Design

Le plan de design, sa relecture et la critique finale — ce qui a été retiré et pourquoi — sont dans [`DESIGN.md`](./DESIGN.md).

## Structure

```
src/
  app/
    page.tsx                    orchestration du parcours complet
    layout.tsx  globals.css     polices et système visuel
    api/convert/route.ts        appel modèle, streaming SSE, cache, quota
    api/stats/route.ts          quota restant et compteur du jour
  components/
    Dropzone  PageThumbs  ConvertProgress  QuotaMeter
    ResultTabs  SummaryView  MindMapView  FlashcardsView
    ExportBar  KeepWork  Highlight  Results
    hero/  PaperBackdrop  Scene  shaders            feuille 3D et repli statique
  lib/
    schemas.ts  prompt.ts  partial-json.ts  sse.ts  cache.ts  latex.ts
    client/     prepare  useConvert  quota
    mindmap/    layout                                 disposition radiale partagée
    export/     summary-pdf  mindmap-pdf  mindmap-png  flashcards-pdf  anki-csv  markdown
    data-model.ts  db/schema.sql                       phase 2
legacy/index.html                                      la page de test qui occupait le dépôt
```
