"use client";

import type { PreparedPage } from "@/lib/client/prepare";

type Props = {
  pages: PreparedPage[];
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  disabled: boolean;
};

export function PageThumbs({ pages, onMove, onRemove, disabled }: Props) {
  if (pages.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="titre text-base">
          {pages.length} page{pages.length > 1 ? "s" : ""} prête{pages.length > 1 ? "s" : ""}
        </h2>
        <p className="text-sm text-encre-clair">Remets-les dans l&apos;ordre du cours.</p>
      </div>

      <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {pages.map((page, index) => (
          <li key={page.id} className="w-[7.5rem] shrink-0">
            <div className="cadre relative bg-papier">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.preview}
                alt={`Page ${index + 1} : ${page.name}`}
                className="block h-[9.5rem] w-full object-cover"
              />
              <span className="absolute left-0 top-0 bg-encre px-1.5 py-0.5 text-xs font-semibold text-papier">
                {index + 1}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label={`Reculer la page ${index + 1}`}
                  className="cadre h-7 w-7 bg-papier text-sm leading-none disabled:opacity-30"
                  disabled={disabled || index === 0}
                  onClick={() => onMove(index, index - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label={`Avancer la page ${index + 1}`}
                  className="cadre h-7 w-7 bg-papier text-sm leading-none disabled:opacity-30"
                  disabled={disabled || index === pages.length - 1}
                  onClick={() => onMove(index, index + 1)}
                >
                  ›
                </button>
              </div>
              <button
                type="button"
                className="bouton-nu text-xs"
                disabled={disabled}
                onClick={() => onRemove(page.id)}
              >
                Retirer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
