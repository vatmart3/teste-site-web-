# Billable Hours — Harlow & Vance

Jeu narratif immersif (première personne, cinématique, sonore) : votre premier jour dans un cabinet
d'avocats d'affaires fictif de Manhattan. Univers 100 % original.

Stack : Next.js 15 (App Router) · TypeScript strict · Tailwind 4 · React Three Fiber + postprocessing ·
GSAP · Zustand · Web Audio API · Vitest.

```bash
npm install
npm run dev          # http://localhost:3000  (démo)   ·   /lab (labo de plans)
npm test             # tests unitaires (projection, caméra, manifeste, audio, directeur)
npm run build
```

## Phase 1 — Moteur de scène 2,5D (livrée)

**Jouable** : `/` lance une démo de ~2 minutes qui utilise toutes les briques du moteur :
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

**Ce qui manque (phases suivantes)** : la vraie séquence d'arrivée (saisie du nom, badge 3D, ascenseur,
personnages) — phase 2 ; objets 3D manipulables + physique (rapier) — phase 3 ; reflets de la ville sur les
vitres et essuie-glaces — avec les plans concernés en phase 2.

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

## Assets attendus pour la phase 2 (séquence d'arrivée)

### Plates → `assets-src/scenes/`
| Fichier | Remarque |
|---|---|
| `01-taxi-night.png` + `01-taxi-night.mp4` | boucle : pluie + essuie-glaces, caméra fixe |
| `02-tower-base.png` | **exception : format portrait 9:16 (≥ 1440 × 2560)** pour le travelling vertical |
| `03-lobby.png` (+ `03-lobby.layer-column.png` optionnel) | le vigile est dans la plate |
| `04-elevator-dawn.png` | skyline très en contrebas (la parallaxe verticale « fait tomber » la ville) |
| `05-reception-52.png` | |
| `06a-openspace.png`, `06b-openspace.png`, `06c-openspace.png` (+ `-night`, `-dusk`) ; `06a-openspace.mp4` | trois pas dans le même couloir |
| `06-rival-door.png` | |
| `07-corner-office.png` | |
| `08-desk-intern-night.png` | |

### Personnages → `public/characters/` (WebM + MP4, 4 à 6 s en boucle)
`harlow-idle`, `harlow-talk`, `nora-idle`, `nora-talk`, `mercer-idle`, `mercer-talk`, `mercer-pleased`,
`mercer-tense`, et le vigile (absent de l'annexe B — suggestion : *security guard around 55, broad
shoulders, grey crew cut, dark navy uniform with brass badge, tired kind eyes*) : `guard-idle`, `guard-talk`.

### Sons → `public/audio/` (annexe C)
`amb-rain-taxi`, `amb-street-rain`, `amb-lobby-marble`, `amb-elevator`, `amb-openspace`,
`amb-office-night`, `sfx-door-revolving`, `sfx-badge-beep`, `sfx-turnstile`, `sfx-elevator-ding`,
`sfx-elevator-doors`, `sfx-phone-vibrate`, `sfx-paper-slide`, `sfx-typewriter-soft`, `mus-office-base`,
`mus-tension-bass`, `mus-tension-drums` — plus quatre noms ajoutés par le moteur : `amb-taxi-radio`,
`amb-printer`, `sfx-car-door`, `sfx-ui-hover`. Stems de musique : même tempo, même durée, bouclables.

### Voix → `public/audio/` (annexe D, convention `vo-<personnage>-<réplique>`)
`vo-harlow-elevator` (~40 s), `vo-guard-name`, `vo-guard-welcome`, `vo-nora-welcome`, `vo-mercer-intro`,
`vo-harlow-briefing`, `vo-harlow-deadline`.
