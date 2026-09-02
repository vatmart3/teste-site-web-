import { hierarchy, tree } from "d3-hierarchy";
import type { MindMap, MindMapNode } from "@/lib/schemas";

/**
 * Une seule disposition, trois rendus (SVG à l'écran, canvas pour le PNG,
 * pdf-lib pour le PDF). Les largeurs de texte sont estimées, pas mesurées :
 * c'est ce qui garantit que l'export est au pixel près ce que l'écran affiche.
 */

export type LaidNode = {
  id: string;
  label: string;
  detail: string;
  depth: number;
  x: number;
  y: number;
  lines: string[];
  width: number;
  height: number;
  hiddenChildren: number;
  hasChildren: boolean;
  parentId: string | null;
};

export type LaidLink = { x1: number; y1: number; x2: number; y2: number; depth: number };

export type MindMapLayout = {
  nodes: LaidNode[];
  links: LaidLink[];
  width: number;
  height: number;
};

const RINGS = [0, 190, 350, 480];
const FONT = [19, 15, 13, 12];
const LINE_HEIGHT = 1.25;
const PAD_X = 12;
const PAD_Y = 8;
const MAX_CHARS = 20;

type Loose = { id: string; label: string; detail?: string; children?: Loose[] };

export function layoutMindMap(map: MindMap, collapsed: ReadonlySet<string>): MindMapLayout {
  const root = hierarchy<Loose>(map.root as Loose, (node) =>
    collapsed.has(node.id) ? [] : (node.children ?? []),
  );

  const radial = tree<Loose>()
    .size([2 * Math.PI, 1])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.7) / Math.max(1, a.depth));
  radial(root);

  const nodes: LaidNode[] = [];
  const positions = new Map<string, { x: number; y: number }>();

  root.each((node) => {
    const depth = Math.min(node.depth, RINGS.length - 1);
    const radius = RINGS[depth] ?? 0;
    const angle = (node.x ?? 0) - Math.PI / 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    positions.set(node.data.id, { x, y });

    const size = FONT[depth] ?? 12;
    const lines = wrap(node.data.label, MAX_CHARS);
    const textWidth = Math.max(...lines.map((line) => line.length)) * size * 0.53;
    nodes.push({
      id: node.data.id,
      label: node.data.label,
      detail: node.data.detail ?? "",
      depth,
      x,
      y,
      lines,
      width: Math.round(textWidth + PAD_X * 2),
      height: Math.round(lines.length * size * LINE_HEIGHT + PAD_Y * 2),
      hiddenChildren: collapsed.has(node.data.id) ? (node.data.children?.length ?? 0) : 0,
      hasChildren: (node.data.children?.length ?? 0) > 0,
      parentId: node.parent ? node.parent.data.id : null,
    });
  });

  const links: LaidLink[] = [];
  for (const node of nodes) {
    if (!node.parentId) continue;
    const from = positions.get(node.parentId);
    const to = positions.get(node.id);
    if (!from || !to) continue;
    links.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, depth: node.depth });
  }

  let minX = 0;
  let minY = 0;
  let maxX = 0;
  let maxY = 0;
  for (const node of nodes) {
    minX = Math.min(minX, node.x - node.width / 2);
    maxX = Math.max(maxX, node.x + node.width / 2);
    minY = Math.min(minY, node.y - node.height / 2);
    maxY = Math.max(maxY, node.y + node.height / 2);
  }
  const margin = 40;
  const offsetX = -minX + margin;
  const offsetY = -minY + margin;

  for (const node of nodes) {
    node.x += offsetX;
    node.y += offsetY;
  }
  for (const link of links) {
    link.x1 += offsetX;
    link.y1 += offsetY;
    link.x2 += offsetX;
    link.y2 += offsetY;
  }

  return {
    nodes,
    links,
    width: Math.round(maxX - minX + margin * 2),
    height: Math.round(maxY - minY + margin * 2),
  };
}

export function fontSizeFor(depth: number): number {
  return FONT[Math.min(depth, FONT.length - 1)] ?? 12;
}

export function lineHeightFor(depth: number): number {
  return fontSizeFor(depth) * LINE_HEIGHT;
}

export function countNodes(node: MindMapNode | undefined): number {
  if (!node) return 0;
  const children = (node.children ?? []) as MindMapNode[];
  return 1 + children.reduce((sum, child) => sum + countNodes(child), 0);
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}
