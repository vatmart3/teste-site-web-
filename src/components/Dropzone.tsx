"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAccepted } from "@/lib/client/prepare";

type Props = {
  onFiles: (files: File[]) => void;
  disabled: boolean;
  compact: boolean;
};

export function Dropzone({ onFiles, disabled, compact }: Props) {
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const take = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || disabled) return;
      const files = Array.from(list);
      const kept = files.filter(isAccepted);
      if (kept.length === 0) {
        setRejected(
          files.length > 0
            ? "Ce format-là, je ne sais pas le lire. Dépose un JPG, un PNG, un HEIC ou un PDF."
            : null,
        );
        return;
      }
      setRejected(kept.length < files.length ? `${files.length - kept.length} fichier(s) ignoré(s) : format non géré.` : null);
      onFiles(kept);
    },
    [disabled, onFiles],
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.files;
      if (items && items.length > 0) {
        event.preventDefault();
        take(items);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [take]);

  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          take(event.dataTransfer.files);
        }}
        data-over={over}
        className={[
          "relative bg-papier transition-[border-width] duration-100",
          over ? "border-[3px] border-bic-bleu" : "border border-encre",
          compact ? "px-4 py-5" : "px-4 py-8 sm:px-8 sm:py-12",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4">
          <p className={compact ? "titre text-lg" : "titre text-xl sm:text-2xl"}>
            {over ? "Lâche, je m'en occupe." : "Dépose ton cours ici."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="bouton sm:hidden"
              disabled={disabled}
              onClick={() => cameraRef.current?.click()}
            >
              Photographier
            </button>
            <button
              type="button"
              className="bouton bouton-blanc sm:bouton"
              disabled={disabled}
              onClick={() => pickerRef.current?.click()}
            >
              <span className="sm:hidden">Choisir dans la galerie</span>
              <span className="hidden sm:inline">Choisir des fichiers</span>
            </button>
            <span className="hidden text-sm text-encre-clair sm:inline">
              ou glisse-les, ou colle-les avec Cmd+V
            </span>
          </div>

          <p className="text-[0.8rem] leading-snug text-encre-clair">
            JPG, PNG, HEIC, WEBP, PDF · jusqu&apos;à 15 pages ·{" "}
            <span className="text-encre">
              tes fichiers ne sont jamais stockés : ils sont lus en mémoire, puis jetés.
            </span>
          </p>
        </div>

        <input
          ref={pickerRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif"
          multiple
          className="sr-only"
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {rejected ? (
        <p role="status" className="mt-2 text-sm text-bic-bleu">
          {rejected}
        </p>
      ) : null}
    </div>
  );
}
