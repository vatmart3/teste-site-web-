# FICHÉ — plan de design

Écrit avant la première ligne de CSS, relu et corrigé avant de coder, critiqué après.

---

## 1. Palette — cinq encres, zéro dégradé

| Nom | Hex | Rôle |
|---|---|---|
| `papier` | `#FFFFFF` | Le fond. Blanc pur, celui d'une photocopie fraîche. Jamais de crème. |
| `encre` | `#0B0B0C` | Le texte, les filets, les cadres, le fond des boutons pleins. Noir laser. |
| `stabilo-jaune` | `#FFE94A` | Surligneur. Uniquement tracé derrière du texte. |
| `stabilo-rose` | `#FF7BB0` | Surligneur. Réservé à ce qui se rate : pièges, pages illisibles, onglet Fiches. |
| `bic-bleu` | `#1B39FF` | Stylo bille. Focus clavier, liens, messages d'erreur. Jamais un fond. |

Deux non-couleurs dérivées : `photocopie #C9C9C6` (le gris sale d'un scan, pour les filets secondaires) et `papier-scan #F4F4F1` (le blanc légèrement cassé d'une deuxième génération de photocopie, pour les onglets inactifs).

**Règle de contraste qui a décidé de la palette.** Le noir sur le bleu stylo donne 1,7:1 — donc le bleu ne surligne jamais, il souligne. Le jaune donne 14:1 et le rose 8,9:1 avec le noir : eux peuvent passer derrière du texte. La contrainte d'accessibilité a fixé le rôle de chaque couleur avant l'esthétique.

## 2. Typographies — deux familles, franchement différentes

**Bricolage Grotesque** (variable, axes `wdth` et `opsz`) — l'affichage. Titre de hero à `wdth 78`, resserrée jusqu'à l'inconfort, comme un titre de journal composé pour tenir sur une ligne. Sert aussi aux boutons, aux onglets, aux libellés, aux nœuds de la carte, au recto des fiches. C'est la voix de l'interface.

**Newsreader** (variable, axe `opsz`, italiques vraies) — la lecture. Corps des résumés, définitions, verso des fiches, listes à retenir. Colonne bloquée à 62 caractères. C'est la voix du cours.

Aucune troisième famille. **Pas de monospace pour les petits libellés** : c'est une signature de rendu générique, et un cours n'a rien d'un terminal. Les petits libellés sont de la Bricolage en petit corps, sans capitales espacées.

## 3. Concept de mise en page

```
┌──────────────────────────────────────────────────────────┐
│ [FICHÉ]                                                  │  ← la marque, surlignée au jaune
│                                                          │
│  Convertisseur de cours                                  │  ← une ligne, énorme, resserrée
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Dépose ton cours ici.                              │  │  ← l'outil, immédiatement
│  │ [Photographier] [Galerie]   ou glisse, ou Cmd+V    │  │
│  │ JPG PNG HEIC PDF · jamais stockés, lus puis jetés  │  │
│  └────────────────────────────────────────────────────┘  │
│  3 sur 3 conversions gratuites aujourd'hui               │  ← quota réel, discret
│                                                          │
│   ░░ TOUT LE FOND EST UNE FEUILLE DE PAPIER EN 3D ░░     │
│   ░░ ondulation légère, lumière rasante, réglures  ░░    │
└──────────────────────────────────────────────────────────┘
        ↓ au dépôt : barre de scan, pli, séparation en trois

 ○                ┌────────┬────────┬────────┐
 ○  ← perforations│ Résumé │ Carte  │ Fiches │              ← intercalaires de classeur
────────────────────────────────────────────────────────────  ← le filet du classeur
  [PDF] [Markdown] [Notion]                Converti en 12 s
  ▌Ce que je n'ai pas pu lire — rien n'a été inventé.
────────────────────────────────────────────────────────────
  Physique — Mécanique · Terminale
  Les lois de Newton                       ┆ Système isolé
  ═══════════════════════════════════════  ┆ Système sur
                                           ┆ lequel aucune
  Un référentiel est galiléen lorsque…     ┆ force…
  (colonne de lecture, 62 caractères)      ┆ (marge)
```

## 4. Trois principes

1. **Le papier est le fond, pas une carte.** Le contenu est posé directement sur la feuille, séparé par des filets d'un pixel comme les réglures d'un polycopié. Aucun `border-radius` sur les surfaces structurelles, aucune ombre douce, aucun dégradé décoratif. Seule la fiche bristol est arrondie (3 px) et porte une ombre portée dure et décalée — parce qu'un carton posé sur une table fait exactement ça.
2. **La couleur est tracée, pas appliquée.** Le jaune et le rose n'existent que sous forme de trait de surligneur : un rectangle légèrement incliné, aux bords irréguliers, tracé en SVG *derrière* le texte, avec une géométrie dérivée d'une graine (identique au serveur et au client). Aucun bouton coloré, aucun badge coloré, aucun fond coloré.
3. **Une seule chorégraphie.** Tout le budget d'animation part dans la séquence dépôt → scan → pli → séparation. Partout ailleurs, rien ne bouge sans qu'un doigt ou une touche l'ait demandé : pas d'entrées en fondu, pas de survol animé sur les cartes.

---

## 5. Relecture du plan — ce que j'ai refait

Le premier jet contenait quatre choses que j'aurais produites pour n'importe quel site. Corrigées avant de coder :

| Premier jet | Pourquoi c'était générique | Remplacé par |
|---|---|---|
| Barre d'onglets en pilules arrondies au-dessus d'une grille de cartes | C'est le kit SaaS par défaut : mêmes rayons, mêmes ombres, mêmes cartes | Des **intercalaires de classeur** : languettes rectangulaires soudées au filet, sans bord inférieur quand elles sont actives, et deux perforations dans la marge à gauche |
| Onglet actif = fond coloré | Applique la couleur au lieu de la tracer, et casse le contraste | Le **surligneur tracé derrière le libellé** de l'onglet actif, plus la languette qui devient blanche et se soude au filet |
| Barre de progression pendant la conversion | Un spinner déguisé, qui ment sur ce qui se passe | Une **barre de scan de photocopieuse** qui balaie le bloc, doublée de la liste des vraies étapes en cours, alimentée par les événements du flux |
| Boutons `Convertir →` avec flèche, méta-infos séparées par des points médians, eyebrow `ÉTAPE 01` en capitales espacées | Les trois tics les plus reconnaissables d'un rendu automatique | Boutons sans flèche, libellés en phrases (`Convertir 2 pages`), aucun eyebrow, aucune capitale espacée |

Deux ajustements sont venus de la lecture des rendus réels, pas du plan :

- La feuille 3D lisait comme un **aplat gris** : la lumière rasante frappe une surface presque plane, donc l'éclairement est quasi constant. J'ai amplifié l'écart au repos d'un facteur 3,4 dans le fragment shader, remonté la base à 0,986 et fait déborder la feuille du cadre. Elle lit maintenant comme du papier blanc éclairé de biais, pas comme un rectangle gris posé au milieu.
- Le LaTeX s'affichait brut (`\sum F_{ext} = m \cdot a`). Montrer du code à un lycéen qui révise, c'est un échec produit. Un convertisseur LaTeX → Unicode de 90 lignes le rend en `Σ F_(ext) = m · a`, sans embarquer de moteur de rendu mathématique. Le LaTeX d'origine reste dans l'export Markdown, où il sert.

---

## 6. Critique finale — ce que je retire

Ce qui a été construit puis coupé, ou volontairement pas construit, parce que ça ne sert pas le brief :

- **Le survol animé sur les vignettes de pages.** Testé, retiré. Le principe 3 dit que la motion répond à une action ; passer la souris n'en est pas une, et sur iPhone — 90 % de la cible — le survol n'existe pas.
- **La section « fonctionnalités » sous le hero.** Jamais écrite. Le brief est explicite et il a raison : la preuve du produit, c'est le produit. Le pied de page dit ce qu'est l'offre en deux phrases, et c'est tout le marketing du site.
- **Le sous-titre du hero.** Coupé. « Photographie ton cours, obtiens tes fiches » ne dit rien que la zone de dépôt ne dise mieux, et il repoussait l'outil sous la ligne de flottaison sur iPhone.
- **Le compteur de preuve sociale sur mobile.** Il est masqué sous 640 px. Sur deux lignes à 380 px, il volait la place au quota, qui est l'information dont l'étudiant a réellement besoin. Il reste visible sur écran large, où il ne coûte rien.
- **La barre de progression au démarrage à zéro.** Elle n'apparaît qu'après la première réponse. Une barre à 0 % en ouvrant un paquet, c'est décourageant et faux : à ce moment-là, personne n'a encore échoué à rien.
- **Le rendu mathématique complet (KaTeX).** Écarté : 280 ko pour des formules de cours de lycée qui tiennent en Unicode. Le contrat des 20 secondes se gagne aussi sur ce qu'on ne charge pas.
- **Le glisser-déposer pour réordonner les pages.** Remplacé par deux boutons `‹` `›`. À 380 px, avec un pouce, le glisser-déposer rate une fois sur trois — et il n'est pas accessible au clavier.
- **L'ombre portée générique sur les blocs.** Une seule ombre subsiste dans tout le produit, dure et décalée de 3/4 px, sur la fiche bristol. Partout ailleurs, la hiérarchie se fait au filet noir, comme sur du papier imprimé.
