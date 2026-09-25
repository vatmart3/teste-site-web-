# Tests de jeu automatisés (étage ouvert)

Pilotent le vrai jeu dans Chromium (rendu logiciel) : marche au clavier, touche E, menus, services des PNJ, décoration à la souris.

```bash
npx next dev -p 3100 &
npm i --no-save playwright-core
node tools/playtest/play.mjs /tmp/shots       # chaque interaction de l'étage (bureau devant/derrière/flanc, PNJ, objets)
node tools/playtest/services.mjs /tmp/shots   # Theo (café, dossier), Priya, Marcus, Vivian → Harlow
node tools/playtest/edit.mjs /tmp/shots       # décoration : poser, déplacer, refus, sortie
```

Chaque ligne `OK` / `FAIL` décrit une vérification ; les captures vont dans le dossier donné.
