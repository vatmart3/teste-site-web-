"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fontSizeFor, layoutMindMap, lineHeightFor } from "@/lib/mindmap/layout";
import type { MindMap } from "@/lib/schemas";

type Props = { map: MindMap };

export function MindMapView({ map }: Props) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [ajuste, setAjuste] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => layoutMindMap(map, collapsed), [map, collapsed]);

  const toggle = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // à l'ouverture, la carte entière tient dans le cadre : personne ne devrait
  // avoir à dézoomer pour découvrir son propre cours
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const ajuster = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const facteur = Math.min(
        1,
        (rect.width - 24) / layout.width,
        (rect.height - 24) / layout.height,
      );
      setAjuste(Math.max(0.25, facteur));
    };
    ajuster();
    const observer = new ResizeObserver(ajuster);
    observer.observe(element);
    return () => observer.disconnect();
  }, [layout.width, layout.height]);

  useEffect(() => {
    setZoom(ajuste);
    setPan({ x: 0, y: 0 });
  }, [ajuste]);

  const reset = useCallback(() => {
    setZoom(ajuste);
    setPan({ x: 0, y: 0 });
    setCollapsed(new Set());
  }, [ajuste]);

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-encre pb-3">
        <p className="text-sm text-encre-clair">
          Touche un nœud pour le replier. Glisse pour déplacer.
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Dézoomer"
            className="cadre h-8 w-8 bg-papier leading-none"
            onClick={() => setZoom((z) => Math.max(0.35, Math.round((z - 0.15) * 100) / 100))}
          >
            −
          </button>
          <span className="w-12 text-center text-sm tabular-nums text-encre-clair">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoomer"
            className="cadre h-8 w-8 bg-papier leading-none"
            onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.15) * 100) / 100))}
          >
            +
          </button>
          <button type="button" className="bouton-nu ml-3 text-sm" onClick={reset}>
            Tout déplier
          </button>
        </div>
      </div>

      <div
        ref={frame}
        className="relative mt-4 h-[68vh] min-h-[26rem] cursor-grab touch-pan-y overflow-hidden border border-encre bg-papier active:cursor-grabbing"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          setPan({
            x: start.panX + (event.clientX - start.x),
            y: start.panY + (event.clientY - start.y),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <svg
          role="tree"
          aria-label="Carte mentale du cours"
          className="absolute left-1/2 top-1/2 origin-center"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {layout.links.map((link, index) => (
            <line
              key={index}
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
              stroke={link.depth <= 1 ? "var(--color-encre)" : "var(--color-photocopie)"}
              strokeWidth={Math.max(0.8, 2.4 - link.depth * 0.5)}
            />
          ))}

          {layout.nodes.map((node) => {
            const size = fontSizeFor(node.depth);
            const lineHeight = lineHeightFor(node.depth);
            const startY = node.y - ((node.lines.length - 1) * lineHeight) / 2 + size * 0.34;
            const label = node.hiddenChildren
              ? `${node.label}, ${node.hiddenChildren} sous-nœuds masqués`
              : node.label;
            return (
              <g key={node.id}>
                <rect
                  x={node.x - node.width / 2}
                  y={node.y - node.height / 2}
                  width={node.width}
                  height={node.height}
                  fill="var(--color-papier)"
                  stroke={node.depth === 0 ? "var(--color-encre)" : "var(--color-photocopie)"}
                  strokeWidth={node.depth === 0 ? 1.6 : 0.8}
                />
                {node.depth === 1 ? (
                  <rect
                    x={node.x - node.width / 2 + 2}
                    y={node.y + node.height / 2 - 6}
                    width={node.width - 4}
                    height={4}
                    fill="var(--color-stabilo-jaune)"
                  />
                ) : null}
                <text
                  x={node.x}
                  y={startY}
                  textAnchor="middle"
                  fontSize={size}
                  fontWeight={node.depth <= 1 ? 650 : 450}
                  fill="var(--color-encre)"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {node.lines.map((line, index) => (
                    <tspan key={index} x={node.x} dy={index === 0 ? 0 : lineHeight}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {node.hiddenChildren > 0 ? (
                  <text
                    x={node.x + node.width / 2 + 9}
                    y={node.y + 4}
                    fontSize={11}
                    fill="var(--color-encre-clair)"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    +{node.hiddenChildren}
                  </text>
                ) : null}
                {node.hasChildren ? (
                  <rect
                    role="button"
                    tabIndex={0}
                    aria-label={`${label}. Entrée pour ${
                      node.hiddenChildren ? "déplier" : "replier"
                    }`}
                    x={node.x - node.width / 2}
                    y={node.y - node.height / 2}
                    width={node.width}
                    height={node.height}
                    fill="transparent"
                    className="cursor-pointer outline-offset-2"
                    onClick={() => toggle(node.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle(node.id);
                      }
                    }}
                  >
                    <title>{node.detail || node.label}</title>
                  </rect>
                ) : node.detail ? (
                  <rect
                    x={node.x - node.width / 2}
                    y={node.y - node.height / 2}
                    width={node.width}
                    height={node.height}
                    fill="transparent"
                  >
                    <title>{node.detail}</title>
                  </rect>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
