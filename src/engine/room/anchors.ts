/**
 * Points 3D des pièces projetés à l'écran (px CSS), pour y accrocher l'interface HTML
 * (points de passage, compteur d'étages, lecteur de badge…). Écrit à chaque frame par RoomAnchorsWriter.
 */
export const roomAnchors: Record<string, { x: number; y: number; visible: boolean }> = {};

export function roomAnchor(id: string): { x: number; y: number; visible: boolean } | null {
  const a = roomAnchors[id];
  return a && a.visible ? a : null;
}
