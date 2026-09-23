/**
 * Démo du moteur (phase 1) : un avant-goût de la séquence d'arrivée qui exerce toutes les briques —
 * pluie sur la vitre + mise au point, travelling vertical sur plate haute, porte qui coupe le son,
 * fondus de profondeur, points de passage, son spatialisé, musique adaptative, secousse.
 * La vraie séquence d'arrivée (plans 1 à 8, badge au nom du joueur) arrive en phase 2.
 */
import type { Sequence } from "@/engine/director/director";

export const engineDemo: Sequence = async (d) => {
  d.preload("02-tower-base");
  await d.cam({ exposure: 0, focus: 0.97, aperture: 0.55, lookAmount: 0.7, panX: 0, panY: 0, dolly: 0 }, 0);
  await d.show("01-taxi-night", { transition: "cut", soundFade: 3 });
  d.music.start();
  d.music.intensity(0);
  void d.letterbox(true);
  await d.fadeBlack(0, 2.5);
  await d.wait(0.6);
  // Mise au point : des gouttes sur le pare-brise vers la ville.
  await d.focus(0.22, 2.4);
  await d.say(undefined, "6 h 40. Manhattan. La pluie ne s'arrête pas.");
  d.sfx("sfx-phone-vibrate", { at: { x: 0.5, y: 0.98 }, depth: 1, volume: 0.9 });
  d.shake(0.25);
  await d.say("SMS — R. Harlow", "52e étage. 7 h 00. Ne sois pas en retard.");
  await d.letterbox(false);
  await d.waitForHotspot("door", "Ouvrez la portière");

  // --- Au pied de la tour : travelling vertical de bas en haut.
  d.sfx("sfx-car-door");
  d.preload("03-lobby");
  await d.fadeBlack(1, 0.5);
  await d.show("02-tower-base", {
    transition: "cut",
    soundFade: 0.4,
    camera: { panY: -0.36, panX: 0, dolly: 0, focus: 0.9, aperture: 0.3, lookAmount: 0.5 },
  });
  void d.letterbox(true);
  await d.fadeBlack(0, 0.9);
  await d.cam({ panY: 0.34, focus: 0.25 }, 6.5, "power2.inOut");
  await d.wait(0.4);
  await d.cam({ panY: -0.36, focus: 0.92 }, 2.6, "power3.inOut");
  await d.letterbox(false);
  await d.waitForHotspot("revolving-door", "Entrez");

  // --- La porte tambour : le son de la rue se coupe net, écho du hall.
  d.sfx("sfx-door-revolving", { volume: 0.9 });
  await d.cam({ dolly: 0.55, dollyX: 0.5, dollyY: 0.9 }, 1.1, "power2.in");
  d.preload("06a-openspace");
  await d.show("03-lobby", {
    transition: "depth",
    duration: 1.6,
    soundFade: 0.2,
    camera: { panY: 0, dolly: 0, focus: 0.15, aperture: 0.4, lookAmount: 1 },
  });
  await d.focus(0.45, 1.8);
  await d.say("Vigile", "Nouveau ? Votre nom ?");
  await d.waitForHotspot("desk", "Avancez jusqu'à l'accueil");

  // --- Travelling vers l'open space.
  d.sfx("sfx-badge-beep", { at: { x: 0.45, y: 0.7 }, depth: 0.7 });
  await d.cam({ dolly: 0.85, dollyX: 0.5, dollyY: 0.62 }, 1.5, "power2.inOut");
  d.sfx("sfx-elevator-ding", { volume: 0.6 });
  await d.show("06a-openspace", { transition: "depth", duration: 1.5, camera: { dolly: 0, focus: 0.3, aperture: 0.3 } });
  d.music.intensity(0.35);
  await d.say(undefined, "Un téléphone sonne sur votre gauche. Bougez la souris : le son suit votre regard.");
  await d.waitForHotspot("forward", "Avancez");
  await d.cam({ dolly: 0.9, dollyX: 0.5, dollyY: 0.45 }, 1.4, "power1.in");
  await d.show("06b-openspace", { variant: "dusk", transition: "depth", duration: 1.3, camera: { dolly: 0, focus: 0.2 } });

  // --- Musique adaptative : la tension monte… puis tout coupe au moment choc.
  d.music.intensity(1, 3);
  await d.focus(0.6, 2.5, 0.6);
  await d.wait(1.5);
  d.music.cut();
  d.sfx("sfx-gavel");
  d.shake(0.8);
  await d.cam({ exposure: 1.6 }, 0.06, "none");
  await d.cam({ exposure: 1 }, 0.5, "power2.out");
  await d.wait(1);
  d.music.resume(3);
  d.music.intensity(0);
  await d.focus(0.2, 1.2, 0.3);
  await d.say(undefined, "Fin de la démo du moteur. La séquence d'arrivée complète arrive en phase 2.");
  await d.waitForHotspot("back", "Recommencer");
};

/** État final de la démo (quand le joueur clique sur « Passer »). */
export const engineDemoEnd: Sequence = async (d) => {
  d.music.start();
  d.music.intensity(0);
  await d.show("06b-openspace", { variant: "dusk", transition: "fade", duration: 0.8, camera: { dolly: 0, focus: 0.2, aperture: 0.3, exposure: 1 } });
  await d.waitForHotspot("back", "Recommencer");
};
