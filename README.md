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
| `npm run preview` | prévisualisation du build |
| `npm run notion:sync` | crée / met à jour les pages Notion |
| `npm run notion:sync:dry` | montre ce qui serait fait, sans rien écrire |

## Raccourcis

| Touche | Effet |
| --- | --- |
| `F` | entrer ou sortir du mode Focus |
| `Échap` | fermer la fiche de cours, sortir du mode Focus |

---

## Configuration Notion, pas à pas

Le script `scripts/notion-sync.mjs` crée une base de données Notion
**« BTS CG — Cours »** et une page par matière détectée dans ton planning, avec un
squelette prêt à remplir : callout d'objectif, programme en toggles, base de fiches de
révision, table des écritures clés (pour P1→P7), exercices à cocher, callout rouge des
erreurs récurrentes, et base des notes obtenues.

### 1. Créer l'intégration

1. Ouvre <https://www.notion.so/profile/integrations>.
2. **Nouvelle intégration** → nomme-la `Registre BTS`, associe-la à ton espace de travail.
3. Type : **Interne**. Capacités : *Lire*, *Insérer* et *Mettre à jour* du contenu.
4. Copie le **jeton d'intégration interne** (il commence par `ntn_`).

### 2. Préparer la page parente

1. Dans Notion, crée (ou choisis) une page qui accueillera la base — par exemple `BTS CG`.
2. Sur cette page : menu `⋯` en haut à droite → **Connexions** → ajoute `Registre BTS`.
   **Sans cette étape, le script renvoie `object_not_found`.**
3. Copie l'URL de la page. L'ID est le bloc de 32 caractères à la fin :
   `https://www.notion.so/BTS-CG-1a2b3c4d5e6f7890abcdef1234567890`
   → `1a2b3c4d5e6f7890abcdef1234567890`.

### 3. Renseigner le `.env`

```bash
cp .env.example .env
```

```dotenv
NOTION_TOKEN=ntn_………
NOTION_PARENT_PAGE_ID=1a2b3c4d5e6f7890abcdef1234567890
```

`.env` est ignoré par git — le jeton ne partira jamais sur GitHub.

### 4. Synchroniser

```bash
npm run notion:sync:dry   # vérification à blanc
npm run notion:sync       # pour de vrai
```

Le script écrit les IDs et URLs dans `src/data/matieres.json`. Recharge le site : le
bouton **« Ouvrir la fiche Notion »** de chaque fiche de cours pointe désormais sur ta page.

**Le script est idempotent.** Relancé, il retrouve la base et les pages existantes,
met à jour les propriétés (professeur, coefficient) et ne recrée jamais de doublon.
Le contenu des pages n'est écrit qu'à leur création : ce que tu saisis à la main n'est
jamais écrasé.

### Variante : le connecteur MCP Notion

Si tu utilises Claude avec le connecteur Notion activé, tu peux court-circuiter le
script et faire créer la base et les pages directement par l'assistant : il dispose des
outils `notion-create-database`, `notion-create-pages` et `notion-update-page`, et n'a
alors besoin d'aucun jeton dans `.env`.

Dans ce cas, il reste une étape manuelle : reporter les URLs obtenues dans
`src/data/matieres.json`, champs `notionPageId` et `notionUrl` de chaque matière. Le
site ne lit que ce fichier — peu importe qui l'a rempli.

Les deux chemins sont interchangeables. L'API brute est le chemin par défaut parce
qu'elle est reproductible en une commande ; le MCP est plus rapide en ponctuel.

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

## Déploiement sur Vercel

### Depuis l'interface

1. <https://vercel.com/new> → importe ce dépôt GitHub.
2. Vercel détecte Vite automatiquement (`vercel.json` fixe déjà `npm run build` et
   `dist/`). Aucune variable d'environnement à déclarer : `NOTION_TOKEN` ne sert qu'en
   local, jamais dans le navigateur.
3. **Deploy.**

### Depuis le terminal

```bash
npm i -g vercel
vercel          # prévisualisation
vercel --prod   # production
```

Chaque `git push` sur la branche par défaut redéploie. Après un
`npm run notion:sync`, pense à committer `src/data/matieres.json` pour que les liens
Notion soient aussi présents en ligne.

⚠️ Tes notes et devoirs vivent dans le `localStorage` du navigateur : ils sont **par
appareil**. Le site déployé ne les synchronise pas entre ton téléphone et ton ordinateur.

---

## Architecture

```
scripts/
  notion-sync.mjs           création idempotente de la base et des pages Notion
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
  store/useRegistre.ts      état persistant (Zustand + localStorage)
  components/
    semaine/                accueil et grille horaire
    fiche/                  panneau de fiche de cours
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

### Sur les coefficients du BTS CG

Les coefficients pré-remplis (E1.1 : 4, E1.2 : 3, E2 : 3, E3 : 6, E4.1 : 9, E4.2 : 4,
E5 : 5, E6 : 5, total 39) sont **indicatifs**. Le référentiel a été modifié en 2024 :
confirme-les auprès du secrétariat du lycée ou de ton professeur principal avant de t'en
servir pour arbitrer tes révisions. Ils sont tous modifiables dans le simulateur.

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
Zustand · date-fns. Three.js n'est chargé qu'à l'entrée en mode Focus.

---

L'ancien site du dépôt est conservé dans `legacy/ancien-site.html`.
