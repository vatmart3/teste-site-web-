"use client";

import { useCallback, useRef, useState } from "react";
import { hashPages, MAX_PAGES, prepareFiles, PrepareError, type PreparedPage } from "./prepare";
import { noteConversion } from "./quota";
import { readEvents, type ConvertEvent, type ConvertStep } from "@/lib/sse";
import type { Conversion, PartialConversion } from "@/lib/schemas";

export type Phase = "idle" | "preparing" | "converting" | "ready";

export type ConvertState = {
  phase: Phase;
  pages: PreparedPage[];
  step: ConvertStep;
  stepLabel: string;
  partial: PartialConversion | null;
  conversion: Conversion | null;
  error: { message: string; hint?: string } | null;
  elapsedMs: number;
  fromCache: boolean;
  conversionsToday: number;
};

const initial: ConvertState = {
  phase: "idle",
  pages: [],
  step: "upload",
  stepLabel: "",
  partial: null,
  conversion: null,
  error: null,
  elapsedMs: 0,
  fromCache: false,
  conversionsToday: 0,
};

export function useConvert() {
  const [state, setState] = useState<ConvertState>(initial);
  const abortRef = useRef<AbortController | null>(null);
  const pagesRef = useRef<PreparedPage[]>([]);
  pagesRef.current = state.pages;

  const addFiles = useCallback(async (files: File[]) => {
    const budget = MAX_PAGES - pagesRef.current.length;
    if (budget <= 0) {
      setState((current) => ({
        ...current,
        error: {
          message: `${MAX_PAGES} pages, c'est le maximum pour une conversion.`,
          hint: "Retire une page, ou lance une deuxième conversion pour la suite du cours.",
        },
      }));
      return;
    }

    setState((current) => ({ ...current, phase: "preparing", error: null }));
    try {
      const prepared = await prepareFiles(
        files,
        (progress) => setState((current) => ({ ...current, stepLabel: progress.label })),
        budget,
      );
      setState((current) => ({
        ...current,
        phase: "idle",
        stepLabel: "",
        pages: [...current.pages, ...prepared].slice(0, MAX_PAGES),
      }));
    } catch (error) {
      const known = error instanceof PrepareError;
      setState((current) => ({
        ...current,
        phase: "idle",
        stepLabel: "",
        error: known
          ? { message: error.message, hint: error.hint }
          : {
              message: "Ces fichiers n'ont pas pu être préparés.",
              hint: "Réessaie avec des photos JPG ou un PDF non protégé.",
            },
      }));
    }
  }, []);

  const movePage = useCallback((from: number, to: number) => {
    setState((current) => {
      const pages = [...current.pages];
      const moved = pages[from];
      if (!moved || to < 0 || to >= pages.length) return current;
      pages.splice(from, 1);
      pages.splice(to, 0, moved);
      return { ...current, pages };
    });
  }, []);

  const removePage = useCallback((id: string) => {
    setState((current) => ({ ...current, pages: current.pages.filter((p) => p.id !== id) }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(initial);
  }, []);

  const convert = useCallback(async (pages: PreparedPage[], examDate: string) => {
    if (pages.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const started = performance.now();
    setState((current) => ({
      ...current,
      phase: "converting",
      step: "upload",
      stepLabel: "",
      partial: null,
      conversion: null,
      error: null,
      fromCache: false,
    }));

    try {
      const hash = await hashPages(pages);
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          hash,
          examDate: examDate || null,
          pages: pages.map((page) => ({ mime: page.mime, data: page.data })),
        }),
      });

      if (!response.body) {
        const payload = (await response.json().catch(() => null)) as ConvertEvent | null;
        setState((current) => ({
          ...current,
          phase: "idle",
          error:
            payload && payload.type === "error"
              ? { message: payload.message, hint: payload.hint }
              : { message: "Le serveur n'a rien renvoyé.", hint: "Relance la conversion." },
        }));
        return;
      }

      if (!response.ok && !response.headers.get("content-type")?.includes("event-stream")) {
        const payload = (await response.json().catch(() => null)) as ConvertEvent | null;
        setState((current) => ({
          ...current,
          phase: "idle",
          error:
            payload && payload.type === "error"
              ? { message: payload.message, hint: payload.hint }
              : { message: "La conversion a été refusée.", hint: "Relance dans un instant." },
        }));
        return;
      }

      for await (const event of readEvents(response.body)) {
        if (event.type === "step") {
          setState((current) => ({ ...current, step: event.step }));
        } else if (event.type === "cached") {
          setState((current) => ({ ...current, fromCache: true }));
        } else if (event.type === "partial") {
          setState((current) => ({ ...current, partial: event.data }));
        } else if (event.type === "done") {
          noteConversion();
          setState((current) => ({
            ...current,
            phase: "ready",
            step: "done",
            conversion: event.data,
            partial: null,
            elapsedMs: Math.round(performance.now() - started),
            conversionsToday: event.today,
          }));
        } else if (event.type === "error") {
          setState((current) => ({
            ...current,
            phase: "idle",
            error: { message: event.message, hint: event.hint },
          }));
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((current) => ({
        ...current,
        phase: "idle",
        error: {
          message: "La conversion s'est interrompue.",
          hint:
            error instanceof Error && error.message.includes("fetch")
              ? "Vérifie ta connexion, puis relance."
              : "Relance la conversion.",
        },
      }));
    }
  }, []);

  return { state, addFiles, movePage, removePage, convert, reset };
}
