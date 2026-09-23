# Billable Hours — Harlow & Vance

Jeu narratif immersif (première personne, cinématique, sonore) : votre premier jour dans un cabinet
d'avocats d'affaires fictif de Manhattan. Univers 100 % original.

Stack : Next.js 15 (App Router) · TypeScript strict · Tailwind 4 · React Three Fiber + postprocessing ·
GSAP · Zustand · Web Audio API · Vitest.

```bash
npm install
npm run dev          # http://localhost:3000  (séquence d'arrivée)   ·   /lab (labo de plans)
npm test             # tests unitaires
npm run build
npm run voices:csv   # liste des répliques à doubler → content/voices.csv
```

## Phase 2 — Séquence d'arrivée (livrée)

**Jouable** : `/` → « Entrer » → l'arrivée complète, en première personne, le joueur agit à chaque plan :

| Plan | Ce qui se passe | Interaction |
|---|---|---|
| 1 Taxi, 6 h 40 | pluie + **essuie-glaces** (shader), mise au point pare-brise → ville, le **téléphone 3D** vibre : SMS de Harlow sur l'écran verrouillé | **glisser** pour ouvrir la portière (ou Entrée) |
| 2 Pied de la tour | travelling vertical sur plate 9:16, **pluie qui tombe vers la caméra** | clic sur la porte tambour (le son de la rue se coupe net, écho du hall) |
| 3 Hall | gros plan du vigile (« Nouveau ? Votre nom ? »), **registre des visiteurs** (prénom, nom, 6 portraits + silhouette), flash, **badge 3D imprimé à son nom avec sa photo** | **glisser le badge sur le lecteur** du portique (ou clic sur le lecteur) → bip, voyant vert, portique |
| 4 Ascenseur | compteur d'étages **mécanique** 1 → 52 (accélération puis freinage), la ville **tombe** (parallaxe de montée), ciel bleu nuit → orange, musique d'ascenseur filtrée ; **message vocal** de Harlow sur le téléphone (forme d'onde qui avance) | DING : portes qui s'ouvrent depuis le centre, la musique devient le thème |
| 5 Accueil du 52e | Nora (mise au point sur elle puis sur le couloir) | point de passage |
| 6 Open space | 3 points de passage, sons spatialisés (téléphone à gauche, conversation à droite, imprimante), puis **Grant Mercer** | **choix en éventail de fiches** : ignorer / répondre / sourire → relation avec Mercer et flag `mercer_intro` |
| 7 Bureau d'angle | Harlow à contre-jour au lever du soleil, briefing ; la **chemise MERIDIAN** glisse sur le bureau | **attraper le dossier** → il s'ouvre, les feuilles (vrais chiffres de l'affaire 1) se déploient vers la caméra |
| 8 Votre bureau | bureau de stagiaire la nuit, néon qui grésille, **horloge murale à l'heure réelle de New York** | fin de l'arrivée (hub interactif en phase 3) |

- **Personnages vivants** même sans vidéo : la zone du personnage (position + profondeur) respire et bouge la tête
  selon son état (`idle`, `talk`, `pleased`, `tense`, `break`), et hoche la tête au rythme de la voix
  (amplitude réelle du fichier audio, ou enveloppe synthétique pendant les sous-titres). Dès que
  `characters/<id>-<état>.webm|mp4` existent, le moteur fait des **fondus enchaînés entre vidéos d'états**.
- **Profil joueur** sauvegardé localement (mode invité) : identité, portrait, relations, choix, arrivée vue.
  L'arrivée devient **sautable** après la première fois ; l'écran-titre propose Continuer / Revoir / Nouvelle partie.
- **Dialogues** dans `src/content/dialogue/arrival.ts` (19 répliques doublées). Sans fichier de voix, les
  sous-titres se lisent à leur rythme ; avec, la voix pilote la durée, baisse la musique (ducking) et anime le personnage.
- `/lab` permet aussi de tester les états des personnages et la montée d'ascenseur.

**Ce qui manque** : physique rapier (phase 3, avec les objets du bureau), le hub interactif (phase 3),
reflets de la ville sur les vitres (à faire avec les vraies plates, pour caler les reflets sur l'image).

## Phase 1 — Moteur de scène 2,5D (livrée)

**Jouable** (la démo de la phase 1 a depuis été remplacée par la séquence d'arrivée) : une démo de ~2 minutes utilisait toutes les briques du moteur :
taxi sous la pluie (gouttes qui réfractent la ville, buée, mise au point du pare-brise vers la ville) →
travelling vertical sur la tour → porte tambour (le son de la rue se coupe, écho du hall) → hall en marbre
(poussière dans les faisceaux, calque de colonne au premier plan) → points de passage dans l'open space
(fondus de profondeur, téléphone spatialisé à gauche) → montée de tension musicale, coupure choc, secousse.
`/lab` permet de régler chaque plan (mise au point, ouverture, poussée, panoramique, roulis, pluie, buée,
néon, rayons, poussière, musique, bruitages) et de vérifier les assets générés.

| Brique | Fichier |
|---|---|
| Shader de plate : ray-march de parallaxe dans la carte de profondeur, profondeur de champ (disque de Vogel + mipmaps), pluie sur la vitre, buée, god rays, néon, fondu de profondeur | `src/engine/plate/plateShader.ts` |
| Plate, calques détourés, boucle vidéo en texture, poussière | `src/engine/plate/PlatePlane.tsx`, `src/engine/fx/Dust.tsx` |
| Mathématiques de projection partagées JS/GLSL (hotspots collés à la plate) | `src/engine/plate/projection.ts` |
| Post-traitement : bloom, ACES Filmic, aberration chromatique, vignettage, grain animé | `src/engine/fx/Effects.tsx` |
| Caméra (parallaxe souris/doigt/gyroscope ±3 %, rotation, secousse, respiration) | `src/engine/camera/rig.ts` |
| Directeur : séquences async + GSAP, sautables, plans, dialogues, hotspots, lettres cinéma | `src/engine/director/director.ts` |
| Son : bus, réverbération par lieu, HRTF, musique en stems, sons de secours synthétisés | `src/engine/audio/` |
| Fallback CSS (sans WebGL2 / appareil faible) et détection de qualité | `src/engine/CssStage.tsx`, `src/engine/device.ts` |
| Lettres cinéma 2,35:1, sous-titres « machine à écrire », points de passage laiton, réglages, muet, Passer | `src/engine/ui/` |
| Registre des plans | `src/content/scenes.ts` |

Accessibilité déjà en place : `prefers-reduced-motion` (et réglage manuel) coupe parallaxe, secousses,
pluie animée et néon ; sous-titres + taille du texte ; hotspots et dialogues au clavier (Tab, Entrée, Espace) ;
bouton muet toujours visible ; invitation à passer en paysage sur téléphone.

**Suite** : la séquence d'arrivée, les essuie-glaces et les premiers objets 3D ont été livrés en phase 2 ;
physique (rapier) et reflets de la ville sur les vitres restent à faire.

### Plates provisoires

Tant qu'un plan n'a pas son image dans `public/scenes`, le moteur peint une plate procédurale (couleur +
profondeur cohérentes) : tout est jouable sans aucun asset. Dès qu'une vraie plate est présente dans le
manifeste, elle la remplace automatiquement.

## Pipeline d'assets

1. Déposez les images sorties du générateur dans **`assets-src/scenes/`** avec les noms de l'annexe A
   (`03-lobby.png`, `06a-openspace-night.png`…), les calques détourés en `03-lobby.layer-column.png`, et les
   boucles image-to-video en `01-taxi-night.mp4`.
2. Lancez la préparation (AVIF 2560/1280 px, profondeur Depth Anything V2, vidéos WebM + MP4 < 3 Mo,
   manifeste) :
   ```bash
   python3 -m venv tools/.venv && source tools/.venv/bin/activate
   pip install -r tools/requirements.txt
   npm run assets:depth            # ou : python3 tools/depth.py 03-lobby --force
   ```
   Modèle par défaut : Depth Anything V2 **Small** (Apache-2.0). Base/Large sont sous licence non
   commerciale — à éviter pour un jeu payant.
3. Voix et sons : directement dans `public/audio/<nom>.mp3|webm|ogg` ; personnages dans
   `public/characters/`. `npm run dev`/`build` régénèrent le manifeste (`npm run assets:manifest` sinon).

Conventions : variante de lumière = suffixe `-dusk` / `-night` ; profondeur = `<plate>.depth.png`
(blanc = proche) ; version mobile = `<plate>@1280.avif` (générée) ; vidéo = `<plate>.webm` + `<plate>.mp4`.

## Assets attendus (séquence d'arrivée — utilisés automatiquement dès qu'ils sont déposés)

### Plates → `assets-src/scenes/`
| Fichier | Remarque |
|---|---|
| `01-taxi-night.png` + `01-taxi-night.mp4` | boucle : pluie + essuie-glaces, caméra fixe |
| `02-tower-base.png` | **exception : format portrait 9:16 (≥ 1440 × 2560)** pour le travelling vertical |
| `03-lobby.png` (+ `03-lobby.layer-column.png` optionnel) | le vigile est dans la plate ; portiques en laiton avec lecteur de badge vers x = 43 %, y = 69 % |
| `03b-lobby-guard.png` | **nouveau plan** (pas dans l'annexe A) : *close-up of a security guard behind a walnut reception desk, black marble wall with gold veins, a small badge printer on the desk at the left* + bloc de style |
| `04-elevator-dawn.png` + `04-elevator-dawn.layer-cabin.png` | **exception** : la skyline en **9:16** (ville en bas, ciel en haut, sans cabine) + la cabine en calque PNG 16:9 **à vitre transparente** (montants laiton, main courante, panneau d'étage vide en haut au centre vers y = 25 %) |
| `05-reception-52.png` | |
| `06a-openspace.png`, `06b-openspace.png`, `06c-openspace.png` (+ `-night`, `-dusk`) ; `06a-openspace.mp4` | trois pas dans le même couloir |
| `06-rival-door.png` | |
| `07-corner-office.png` | |
| `08-desk-intern-night.png` | |

### Personnages → `public/characters/`
Vidéos d'états (WebM + MP4, 4 à 6 s en boucle), **générées à partir de la plate du plan** où le personnage
apparaît (même cadrage, pour que le fondu soit invisible) : `guard-idle`, `guard-talk` (plan `03b`),
`nora-idle`, `nora-talk`, `nora-pleased` (plan `05`), `mercer-idle`, `mercer-talk`, `mercer-pleased`,
`mercer-tense` (plan `06-rival-door`), `harlow-idle`, `harlow-talk` (plan `07`).
Le vigile n'est pas dans l'annexe B : sa description est dans `src/content/characters.ts`.

Portraits proposés au joueur pour son badge : `player-1.png` … `player-6.png` (buste de face, fond neutre,
format 4:5, personnes fictives variées). Sans eux, six portraits stylisés sont peints à la volée.

### Sons → `public/audio/` (annexe C)
`amb-rain-taxi`, `amb-street-rain`, `amb-lobby-marble`, `amb-elevator`, `amb-openspace`,
`amb-office-night`, `sfx-door-revolving`, `sfx-badge-beep`, `sfx-turnstile`, `sfx-elevator-ding`,
`sfx-elevator-doors`, `sfx-phone-vibrate`, `sfx-paper-slide`, `sfx-typewriter-soft`, `mus-office-base`,
`mus-tension-bass`, `mus-tension-drums` — plus les noms ajoutés par le moteur : `amb-taxi-radio`,
`amb-printer`, `amb-conversation`, `amb-office-day`, `sfx-car-door`, `sfx-ui-hover`, `sfx-badge-print`,
`sfx-camera-flash`, `sfx-footsteps`. Stems de musique : même tempo, même durée, bouclables.

### Voix → `public/audio/vo-<id>.mp3`
La liste exacte (19 répliques : id, personnage, texte, émotion, nom de fichier) est dans
**`content/voices.csv`** (`npm run voices:csv`). Le message vocal de l'ascenseur est découpé en 5 fichiers
(`vo-harlow-voicemail-1` … `-5`, ~40 s au total) pour caler les sous-titres.

## Assets pour la phase 3 (le bureau hub)
- Plates : `08-desk-intern-night.png` (+ `-dusk`, `-day`) ; les 3 autres bureaux de rang : `08-desk-associate.png`
  (petite fenêtre sur cour), `08-desk-senior.png`, `08-desk-partner.png`.
- Objets 3D (glTF/GLB, CC0, Poly Haven ou Sketchfab CC0) → `public/models/` : `desk-phone.glb`, `briefcase.glb`,
  `coffee-cup.glb`, `folder.glb` (optionnel, le moteur a une chemise procédurale), `stamp.glb`.
- Sons : `sfx-desk-phone-ring`, `sfx-briefcase-open`, `sfx-paper-flip`, `sfx-stamp`, `amb-office-night`.
