/** Petits bus d'événements entre l'interface HTML et le directeur. */
type Handler<T> = (v: T) => void;

function bus<T>() {
  const hs = new Set<Handler<T>>();
  return {
    emit: (v: T) => {
      for (const h of [...hs]) h(v);
    },
    on: (h: Handler<T>) => {
      hs.add(h);
      return () => {
        hs.delete(h);
      };
    },
  };
}

/** Clic sur un hotspot / point de passage (id). */
export const hotspotBus = bus<string>();
/** Le joueur demande à passer la réplique en cours. */
export const advanceBus = bus<void>();
/** Le joueur demande à sauter la cinématique. */
export const skipBus = bus<void>();
/** Réponse du joueur à un panneau (identité, choix, geste). */
export const panelBus = bus<unknown>();
