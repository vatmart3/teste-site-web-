# REGISTRE

Poste de commandement pour le BTS Comptabilité et Gestion — VATUONE Jérémy, STS1 CG,
lycée Jules Guesde, Montpellier.

Emploi du temps interactif, fiches de cours reliées à Notion, notes et devoirs, et la
boîte à outils métier (plan comptable, TVA, écritures, amortissements, calculs
commerciaux, seuil de rentabilité, simulateur de moyenne).

---

## Démarrage

```bash
npm install
npm run dev          # http://localhost:5173
```

C'est tout : le site fonctionne sans Notion, sans compte, sans serveur. Toutes tes
données (notes, devoirs, bloc-notes, chapitres cochés, créneaux modifiés) sont stockées
dans le `localStorage` de ton navigateur et survivent au rafraîchissement.

Autres commandes :

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | compilation de production dans `dist/` |
| `npm run build:pages` | compilation pour GitHub Pages (chemin de base `BASE_PAGES`) |
| `npm run build:fichier` | assemble tout le site en un seul fichier HTML autonome |
| `npm run preview` | prévisualisation du build |
| `npm run notion:sync` | crée / met à jour les pages Notion |
| `npm run notion:sync:dry` | montre ce qui serait fait, sans rien écrire |

## Raccourcis

| Touche | Effet |
| --- | --- |
| `F` | entrer ou sortir du mode Focus |
| `Échap` | fermer l'écran de matière, sortir du mode Focus |

Menu : **Planning**, **Matières**, **Devoirs**, **Notes**, puis **Outils BTS CG**,
**Emploi du temps** et **Réglages**.

Un clic sur un cours ouvre son écran : **Commencer** lance un chrono, **Terminer la
séance** enregistre le temps passé dans cette matière.

---

## Les rappels

Trois niveaux, du plus discret au plus insistant :

1. **Le prochain cours, toujours affiché** — sous le planning : « dans 23 min · P3 Fiscalité ·
   B317 ». Rien à activer.
2. **Le bandeau** — dès qu'un cours démarre dans moins de 30 minutes, un bandeau à la couleur
   de la matière s'installe sous l'heure et bat doucement dans les dix dernières minutes.
   Cliquer dessus ouvre l'écran de la matière.
3. **La notification système** — bouton « Activer les rappels » en bas de l'écran. Le
   navigateur demande l'autorisation, puis t'envoie une notification 10 minutes avant chaque
   cours. Elle ne part que si un onglet du site est ouvert quelque part.

### Notion s'ouvre dans Safari, pas dans l'app

Sur iPhone et iPad, un lien `notion.so` est un *universal link* : iOS le détourne vers
l'application Notion. Le site contourne ça avec le schéma `x-safari-https://`, que Safari
enregistre justement pour forcer l'ouverture dans le navigateur.

C'est **activé par défaut**, et réglable dans **Réglages → Notion**. Sur les autres
appareils le réglage n'a aucun effet : les liens s'ouvrent déjà dans le navigateur. Si le
bouton ne réagit pas sur ton iPhone, décoche l'option — le lien redevient une URL normale.

### Sur iPhone

La notification du navigateur ne marche sur iOS que si le site est installé comme
application :

1. Ouvre le site dans **Safari** (pas Chrome).
2. Bouton **Partager** → **Sur l'écran d'accueil**. L'icône s'installe, le site s'ouvre en
   plein écran, sans barre d'adresse.
3. Ouvre-le depuis l'icône, puis touche **Activer les rappels** et accepte.

Pour que ça se déclenche tout seul le matin, l'app **Raccourcis** fait le travail :

> Raccourcis → **Automatisation** → **+** → **Heure de la journée** → 7 h 45, répéter
> **tous les jours** (ou seulement en semaine) → **Exécuter immédiatement** →
> action **Ouvrir l'app** et choisis *Registre*.

Le site s'ouvre seul chaque matin, recharge ton planning et arme les rappels de la journée.

---

## Notion

Le dépôt est déjà relié à ton Notion. Sous la page **BTS COMPTA** se trouve la base
**« BTS CG — Cours »** et une page par matière, avec le programme en toggles, la table
Situation / Débit / Crédit, les exercices à cocher et le callout rouge des erreurs
récurrentes. `src/data/matieres.json` contient les identifiants et les URLs de ces pages.

### Comment le site lit Notion

Deux chemins, choisis automatiquement :

1. **En direct.** Sur la page publiée comme Artifact claude.ai, avec le connecteur Notion
   actif, le site appelle réellement `notion-fetch` à l'ouverture d'une matière : ce que tu
   vois est ta page Notion à la seconde. L'écran l'indique — *« Contenu lu en direct dans
   ton Notion »*.
2. **Le miroir local.** Partout ailleurs (GitHub Pages, Vercel, hors ligne), le site affiche
   la copie stockée dans `matieres.json`, avec la même mise en forme. L'écran l'indique —
   *« Copie locale de ta page Notion »*.

Le bouton **Ouvrir dans Notion** de chaque matière pointe toujours sur la vraie page.

### Recréer ou compléter les pages avec l'API

`scripts/notion-sync.mjs` fait le même travail sans passer par Claude, avec un jeton :

1. <https://www.notion.so/profile/integrations> → **Nouvelle intégration** interne, avec les
   capacités *Lire*, *Insérer* et *Mettre à jour*. Copie le jeton (`ntn_…`).
2. Dans Notion, sur la page **BTS COMPTA** : menu `⋯` → **Connexions** → ajoute
   l'intégration. **Sans cette étape, le script renvoie `object_not_found`.**
3. `cp .env.example .env`, puis renseigne `NOTION_TOKEN` et `NOTION_PARENT_PAGE_ID`
   (le bloc de 32 caractères à la fin de l'URL de la page).
4. `npm run notion:sync:dry` pour vérifier, `npm run notion:sync` pour de vrai.

Le script est **idempotent** : relancé, il retrouve la base et les pages existantes, met à
jour leurs propriétés et ne recrée jamais de doublon. Le contenu d'une page n'est écrit
qu'à sa création : ce que tu saisis à la main n'est jamais écrasé.

`.env` est ignoré par git — le jeton ne part jamais sur GitHub.

### Variante : le connecteur MCP

C'est le chemin qui a servi ici. Si tu utilises Claude avec le connecteur Notion activé,
l'assistant crée et met à jour les pages directement, sans aucun jeton dans `.env` — il
reste seulement à reporter les URLs obtenues dans `src/data/matieres.json`. Le site ne lit
que ce fichier : peu importe qui l'a rempli.

---

## Modifier ton emploi du temps

### Depuis le site (le plus simple)

Onglet **Emploi du temps** : ajoute, modifie ou supprime un créneau sans toucher au
code. Les changements sont enregistrés immédiatement dans ton navigateur.

Tu y règles aussi la **période en cours** (semestre 1 ou 2, quinzaine Q1 ou Q2) : les
créneaux qui ne tombent qu'à un semestre ou qu'une semaine sur deux sont filtrés en
conséquence dans la vue Semaine et le mode Focus.

Pour que tes modifications deviennent la version de référence du dépôt (et te suivent
d'une machine à l'autre) : bouton **« Télécharger planning.json »**, puis remplace
`src/data/planning.json`.

### Directement dans le fichier

`src/data/planning.json` est fait pour être lu et modifié à la main :

```json
{
  "id": "lun-0900-lv1",
  "jour": "lundi",
  "debut": "09:00",
  "fin": "10:00",
  "code": "LV1",
  "matiere": "Anglais LVA",
  "professeur": "MOKHNACHI N.",
  "salle": "B318",
  "groupe": null,
  "semestre": null,
  "quinzaine": null
}
```

- `id` — libre, doit rester unique.
- `jour` — `lundi` … `samedi`.
- `debut` / `fin` — `"HH:MM"`, en 24 h.
- `code` — doit exister dans `src/data/matieres.json` (c'est lui qui relie le créneau à
  ta fiche, tes notes et ta page Notion).
- `groupe` — `null` = classe entière.
- `semestre` — `1`, `2` ou `null` (toute l'année).
- `quinzaine` — `"Q1"`, `"Q2"` ou `null` (toutes les semaines).

`meta.bornes` définit les traits horaires dessinés dans la grille ; `meta.amplitude`
la plage affichée. Le samedi n'apparaît que s'il porte au moins un créneau.

### Ajouter une matière

Dans `src/data/matieres.json` : un objet par matière, avec `code`, `nom`, `nomCourt`
(libellé compact affiché dans la grille), `professeur`, `epreuve`, `coefficient`,
`objectif`, `teinte` (`encre`, `vert`, `prune`, `bleu`, `rose`, `or`, `papier`) et la
liste `chapitres`. Relance ensuite `npm run notion:sync` pour créer sa page.

---

## Ouvrir le site sur le web

Trois façons, de la plus rapide à la plus durable.

### 1. GitHub Pages — automatique à chaque push

Le dépôt contient déjà le workflow `.github/workflows/deploy-pages.yml`. Une seule
chose à faire, une fois pour toutes :

> **Settings → Pages → Build and deployment → Source : « GitHub Actions »**

Le prochain push publie le site sur `https://<compte>.github.io/<dépôt>/`. Le workflow
règle tout seul le chemin de base à partir du nom du dépôt, et se relance à la main
depuis l'onglet **Actions → Déployer sur GitHub Pages → Run workflow**.

### 2. Un seul fichier HTML

```bash
npm run build:fichier
```

Produit `dist-fichier/registre.html` : environ 1,2 Mo, tout en ligne (CSS et
JavaScript compris), aucune dépendance sauf les polices Google. Ouvrable d'un
double-clic, transférable par clé USB ou pièce jointe, déposable sur n'importe quel
hébergeur statique.

Le script écrit aussi `registre-fragment.html`, la même page sans les balises
`<!doctype>` / `<html>` / `<head>` / `<body>`, pour les hébergeurs qui fournissent
eux-mêmes l'enveloppe du document.

### 3. Vercel

#### Depuis l'interface

1. <https://vercel.com/new> → importe ce dépôt GitHub.
2. Vercel détecte Vite automatiquement (`vercel.json` fixe déjà `npm run build` et
   `dist/`). Aucune variable d'environnement à déclarer : `NOTION_TOKEN` ne sert qu'en
   local, jamais dans le navigateur.
3. **Deploy.**

#### Depuis le terminal

```bash
npm i -g vercel
vercel          # prévisualisation
vercel --prod   # production
```

Chaque `git push` sur la branche par défaut redéploie. Après un
`npm run notion:sync`, pense à committer `src/data/matieres.json` pour que les liens
Notion soient aussi présents en ligne.

⚠️ Tes notes et devoirs vivent dans le `localStorage` du navigateur : ils sont **par
appareil et par adresse**. Le site déployé ne les synchronise pas entre ton téléphone et
ton ordinateur, et une même donnée saisie sur GitHub Pages n'apparaîtra pas sur Vercel.
Choisis une adresse et tiens-t'y.

### Enregistrer un fichier depuis le site

Les deux exports (le CSV du plan d'amortissement et `planning.json`) fonctionnent
partout. Sur un hébergeur classique, c'est un téléchargement normal ; sur une page
publiée comme Artifact claude.ai, où les liens de téléchargement sont bloqués, le site
passe automatiquement par la capacité `downloads` du visualiseur, qui te demande
confirmation. Le repli est transparent (`src/lib/telechargement.ts`).

---

## Architecture

```
.github/workflows/
  deploy-pages.yml          déploiement automatique sur GitHub Pages
scripts/
  notion-sync.mjs           création idempotente de la base et des pages Notion
  build-fichier-unique.mjs  assemblage du site en un fichier HTML autonome
src/
  data/
    planning.json           ← tes créneaux (modifiable à la main)
    matieres.json           ← tes matières + liens Notion (écrit par le script)
    pcg.ts                  plan comptable général (294 comptes, classes 1→7)
    schemas.ts              schémas d'écritures types
    epreuves.ts             épreuves et coefficients du BTS CG
  lib/
    compta.ts               TVA, amortissements, marges, seuil de rentabilité
    moyennes.ts             moyennes pondérées, moyenne générale, mentions
    selection.ts            cours en cours, prochain cours, retards, consigne du moment
    temps.ts                conversions horaires, semaine ISO, quinzaines
    hooks.ts                horloges, mouvement réduit, enregistrement différé, copie
    telechargement.ts       export de fichiers, avec repli selon l'hébergeur
    notion.ts               lecture directe de Notion + analyse du Markdown enrichi
    rappels.ts              cours à signaler, notifications système
    liens.ts                ouverture de Notion dans Safari sur iOS
  store/useRegistre.ts      état persistant (Zustand + localStorage)
  components/
    shell/                  menu latéral, barre du haut, panneau de droite, icônes
    semaine/                planning : vue semaine et vue mois
    vues/                   matières, devoirs, notes, réglages
    fiche/                  écran de matière : chrono, Notion, notes, devoirs
    focus/                  mode plein écran et anneau Three.js
    outils/                 les sept outils BTS CG
    edition/                éditeur d'emploi du temps
```

## Les outils, en deux mots

- **Plan comptable** — 294 comptes du PCG, recherche par numéro ou intitulé (avec alias :
  chercher `445510` trouve `44551`), filtre par classe, clic = numéro copié.
- **TVA** — conversion HT ↔ TTC ↔ montant de TVA aux taux 20 / 10 / 5,5 / 2,1 %, avec le
  compte à mouvementer selon le sens et le rappel de l'écriture de déclaration.
- **Saisie d'écriture** — autocomplétion sur le plan comptable, contrôle d'équilibre en
  temps réel, 13 schémas types pré-remplis (achat, vente, immobilisation, paie, règlement,
  effet de commerce, dotation, déclaration de TVA, créance douteuse…).
- **Amortissements** — linéaire (prorata au jour près, base 30/360) et dégressif
  (coefficients 1,25 / 1,75 / 2,25, bascule automatique en linéaire), plan complet et
  export CSV.
- **Calculs commerciaux** — réductions en cascade, escompte, marge, taux de marge, taux de
  marque, coefficient multiplicateur.
- **Seuil de rentabilité** — MCV, taux de MCV, SR en euros et en quantités, point mort daté,
  marge et indice de sécurité, levier opérationnel, graphique du point mort.
- **Moyenne BTS** — épreuves et coefficients éditables, report des moyennes réelles,
  points manquants pour atteindre 10.

### Sur les épreuves du BTS CG

La numérotation et les coefficients viennent de ta propre page Notion
**« KIT DE SURVIE BTS CG »** : E5 étude de cas coef. 9 (écrit 4 h 30, mai 2028, sur P1 à P4
et P7), E6 pratique comptable coef. 4 (CCF sur 14 points + oral de 20 min sur 6, PGI EBP),
E7 contrôle de gestion et analyse financière coef. 5 (CCF + oral, sur Excel, P5, P6 et P7),
E8 parcours de professionnalisation coef. 5 (rapport de stage + oral de 30 min).

Les coefficients de E1 à E4 (culture générale 4, anglais 3, maths 3, CEJM 6) suivent la
grille usuelle pour un total de 39 et **restent à confirmer avec le lycée**. Tout est
modifiable dans le simulateur.

La date d'examen par défaut est **mai 2028**, elle aussi d'après tes notes.

## Où sont stockées tes données

Deux niveaux, empilés — le site choisit tout seul, et l'affiche dans **Réglages →
Sauvegarde** ainsi que par un point coloré en bas du menu.

1. **Le navigateur** (`localStorage`), toujours actif. Instantané, mais propre à un
   appareil : ce que tu saisis sur le téléphone n'apparaît pas sur l'ordinateur, et un
   vidage du cache l'efface.
2. **La base de l'application**, quand la page tourne comme Artifact claude.ai. Les
   données sont alors stockées côté serveur, dans un document `registre/etat`. Elles
   suivent d'un appareil à l'autre, en direct : une note ajoutée sur le téléphone apparaît
   sur l'ordinateur sans rien faire.

La base fait autorité dès qu'elle répond. À l'ouverture, le site compare les horodatages
et garde la version la plus récente, dans les deux sens. Les écritures sont regroupées
(900 ms d'inactivité) pour ne pas marteler la base à chaque frappe.

Le code tient dans `src/lib/sauvegarde.ts` et `src/lib/useSauvegarde.ts` ; les champs
persistés sont listés dans `CHAMPS_SAUVEGARDES`.

### Sauvegarde en fichier

**Réglages → Exporter un fichier de sauvegarde** produit un JSON qui contient tout :
créneaux, notes, devoirs, séances, bloc-notes, chapitres cochés, réglages. **Restaurer
depuis un fichier** le relit. C'est le filet de sécurité qui marche partout, y compris sur
GitHub Pages et Vercel où la base n'existe pas — et le seul moyen de passer tes données
d'une adresse à l'autre.

## Contraste

Tous les textes du site sont au-dessus de **6:1** sur leur fond réel, la grande majorité
entre 9 et 11:1 — mesuré avec un script qui parcourt chaque vue, lit la couleur calculée
de chaque texte et remonte à son fond opaque. Les seuils WCAG AA demandent 4,5:1 pour le
texte courant et 3:1 pour les gros titres : le site les dépasse partout.

Ce que ça implique dans le code, si tu modifies les couleurs :

- `--color-encre` (blanc) pour les titres et le texte principal ;
- `--color-encre-doux` (`#E8EAF0`) pour les paragraphes et descriptions, via la classe
  `.texte-doux` ;
- `--color-encre-clair` (`#C2C6D6`) pour les étiquettes, métadonnées et en-têtes de
  colonnes, via `.folio` et `.etiquette` ;
- les couleurs de matière servent à la fois de **texte sur fond sombre** et de **fond avec
  texte sombre** : elles doivent rester claires pour tenir des deux côtés ;
- l'indigo d'accent est `#5F4FCB` et non `#6C5DD3` : sur ce dernier, du texte blanc ne
  donnait que 5,07:1.

Les petits textes sont à 12 px minimum, jamais 11.

Deux pièges rencontrés, à ne pas réintroduire :

- **Ne jamais baisser l'opacité d'un conteneur qui porte des blocs colorés.** Le texte des
  blocs est sombre sur fond clair : faire fondre le tout vers le fond de page donne du
  noir sur noir. Une journée écoulée utilise un traitement dédié (`.bloc-passe` : surface
  sombre, texte clair, filet dans la couleur de la matière), pas une opacité.
- **Safari sur iOS ignore `color` sur les champs** et applique sa couleur système : le
  texte saisi ressortait en noir. Il faut `-webkit-text-fill-color`, plus
  `color-scheme: dark` et les sélecteurs `::-webkit-datetime-edit-*` pour les champs de
  date.

## Accessibilité et confort

- Responsive jusqu'au mobile ; la grille horaire défile horizontalement d'un bloc,
  en-tête compris.
- Focus clavier visible partout (anneau or), rôles ARIA sur les onglets, la fiche
  (`dialog`), l'autocomplétion (`combobox`) et le graphique.
- `prefers-reduced-motion` respecté : la séquence d'ouverture, la rotation de l'anneau 3D
  et la transition du panneau sont neutralisées.
- Aucune donnée perdue au rafraîchissement.

## Pile technique

Vite · React 18 · TypeScript · Tailwind CSS v4 · GSAP · @react-three/fiber + drei ·
Zustand · date-fns. Anton pour les titres, Plus Jakarta Sans pour l'interface, IBM Plex
Mono pour les chiffres. Three.js n'est chargé qu'à l'entrée en mode Focus. **Anton est
embarquée dans la feuille de style** (sous-ensemble latin, 12 ko) : la police qui porte
toute l'identité de l'écran ne dépend d'aucun CDN et fonctionne hors ligne.

---

L'ancien site du dépôt est conservé dans `legacy/ancien-site.html`.
