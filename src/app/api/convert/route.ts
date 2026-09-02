import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import {
  cacheGet,
  cacheSet,
  consumeQuota,
  conversionsToday,
  remainingQuota,
} from "@/lib/cache";
import { parsePartialJson } from "@/lib/partial-json";
import { SYSTEM_PROMPT, userInstruction } from "@/lib/prompt";
import {
  conversionSchema,
  modelOutputJsonSchema,
  type Conversion,
  type PartialConversion,
} from "@/lib/schemas";
import { encodeEvent, type ConvertEvent } from "@/lib/sse";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
const EFFORT = (process.env.ANTHROPIC_EFFORT ?? "low") as
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";
const FREE_QUOTA = Number(process.env.FICHE_FREE_QUOTA ?? "3");
const MAX_PAGES = 15;
const MAX_BYTES_PER_PAGE = 1_500_000;

type ImageMime = "image/jpeg" | "image/png" | "image/webp";
const ALLOWED_MIME: ImageMime[] = ["image/jpeg", "image/png", "image/webp"];

type RequestBody = {
  hash?: unknown;
  examDate?: unknown;
  pages?: unknown;
};

type Page = { mime: ImageMime; data: string };

function readPages(body: RequestBody): Page[] | string {
  if (!Array.isArray(body.pages)) return "Aucune page reçue.";
  if (body.pages.length === 0) return "Aucune page reçue.";
  if (body.pages.length > MAX_PAGES) return `${MAX_PAGES} pages maximum par conversion.`;

  const pages: Page[] = [];
  for (const raw of body.pages) {
    if (typeof raw !== "object" || raw === null) return "Page mal formée.";
    const { mime, data } = raw as { mime?: unknown; data?: unknown };
    if (typeof mime !== "string" || typeof data !== "string") return "Page mal formée.";
    if (!ALLOWED_MIME.includes(mime as ImageMime)) return `Format non géré : ${mime}.`;
    if (data.length * 0.75 > MAX_BYTES_PER_PAGE) return "Une page dépasse 1,5 Mo après compression.";
    pages.push({ mime: mime as ImageMime, data });
  }
  return pages;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "anonyme";
  return request.headers.get("x-real-ip") ?? "anonyme";
}

export async function POST(request: NextRequest): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(
      {
        type: "error",
        message: "Le serveur n'a pas de clé Anthropic.",
        hint: "Ajoute ANTHROPIC_API_KEY dans .env.local puis relance le serveur.",
      },
      500,
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return json({ type: "error", message: "Requête illisible." }, 400);
  }

  const pages = readPages(body);
  if (typeof pages === "string") {
    return json({ type: "error", message: pages }, 400);
  }

  const hash = typeof body.hash === "string" ? body.hash : "";
  const examDate = typeof body.examDate === "string" && body.examDate ? body.examDate : null;
  const ip = clientIp(request);

  const cached = hash ? cacheGet(hash) : null;
  if (cached) {
    return streamOf([
      { type: "cached" },
      { type: "done", data: cached, elapsedMs: 0, today: conversionsToday() },
    ]);
  }

  if (remainingQuota(ip, FREE_QUOTA) <= 0) {
    return json(
      {
        type: "error",
        message: `Tu as utilisé tes ${FREE_QUOTA} conversions gratuites du jour.`,
        hint: "Reviens demain, ou reconvertis un cours déjà converti : c'est instantané et hors quota.",
      },
      429,
    );
  }

  const client = new Anthropic({ apiKey });
  const started = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ConvertEvent) => {
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          // client parti
        }
      };

      try {
        send({ type: "step", step: "read" });
        const text = await streamModel(client, pages, examDate, send);

        const parsed = parsePartialJson<unknown>(text);
        let conversion = safeParse(parsed);

        if (!conversion) {
          // Retry unique : on redemande une sortie conforme, sans streaming.
          send({ type: "step", step: "read" });
          const repaired = await repairCall(client, pages, examDate, text);
          conversion = safeParse(repaired);
        }

        if (!conversion) {
          send({
            type: "error",
            message: "Le modèle n'a pas produit un résultat exploitable.",
            hint: "Relance la conversion. Si ça recommence, réduis le nombre de pages.",
          });
          controller.close();
          return;
        }

        consumeQuota(ip);
        if (hash) cacheSet(hash, conversion);
        send({ type: "step", step: "done" });
        send({
          type: "done",
          data: conversion,
          elapsedMs: Date.now() - started,
          today: conversionsToday(),
        });
      } catch (error) {
        send({ type: "error", ...describe(error) });
      } finally {
        try {
          controller.close();
        } catch {
          // déjà fermé
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

function contentFor(pages: Page[], examDate: string | null): Anthropic.MessageParam[] {
  const content: Anthropic.ContentBlockParam[] = pages.map((page) => ({
    type: "image",
    source: { type: "base64", media_type: page.mime, data: page.data },
  }));

  content.push({ type: "text", text: userInstruction(pages.length, examDate) });
  return [{ role: "user", content }];
}

async function streamModel(
  client: Anthropic,
  pages: Page[],
  examDate: string | null,
  send: (event: ConvertEvent) => void,
): Promise<string> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    thinking: { type: "disabled" },
    output_config: { effort: EFFORT, format: { type: "json_schema", schema: modelOutputJsonSchema } },
    messages: contentFor(pages, examDate),
  });

  let text = "";
  let lastPush = 0;
  let reached: "read" | "summary" | "mindmap" | "flashcards" = "read";

  for await (const event of stream) {
    if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
    text += event.delta.text;

    const stage = stageOf(text);
    if (stage !== reached) {
      reached = stage;
      send({ type: "step", step: stage });
    }

    const now = Date.now();
    if (now - lastPush < 120) continue;
    lastPush = now;
    const partial = parsePartialJson<PartialConversion>(text);
    if (partial) send({ type: "partial", data: partial });
  }

  const partial = parsePartialJson<PartialConversion>(text);
  if (partial) send({ type: "partial", data: partial });
  return text;
}

/** L'ordre des clés du schéma est l'ordre de génération : il suffit de regarder
 *  quelle clé est déjà apparue pour savoir où en est le modèle. */
function stageOf(text: string): "read" | "summary" | "mindmap" | "flashcards" {
  if (text.includes('"flashcards"')) return "flashcards";
  if (text.includes('"mindmap"')) return "mindmap";
  if (text.includes('"summary"')) return "summary";
  return "read";
}

async function repairCall(
  client: Anthropic,
  pages: Page[],
  examDate: string | null,
  broken: string,
): Promise<unknown> {
  const messages = contentFor(pages, examDate);
  messages.push({
    role: "assistant",
    content: [{ type: "text", text: broken.slice(0, 4000) }],
  });
  messages.push({
    role: "user",
    content: [
      {
        type: "text",
        text: "Cette sortie est incomplète ou invalide. Reprends depuis le début et renvoie l'objet JSON complet et conforme au schéma. Mêmes règles : rien d'inventé, langue du cours.",
      },
    ],
  });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    thinking: { type: "disabled" },
    output_config: { format: { type: "json_schema", schema: modelOutputJsonSchema } },
    messages,
  });

  const block = response.content.find((c) => c.type === "text");
  return block && block.type === "text" ? parsePartialJson<unknown>(block.text) : null;
}

function safeParse(value: unknown): Conversion | null {
  if (!value) return null;
  const result = conversionSchema.safeParse(value);
  return result.success ? result.data : null;
}

function describe(error: unknown): { message: string; hint?: string } {
  if (error instanceof Anthropic.RateLimitError) {
    return {
      message: "Trop de conversions en même temps.",
      hint: "Attends une trentaine de secondes et relance.",
    };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return {
      message: "La clé Anthropic est refusée.",
      hint: "Vérifie ANTHROPIC_API_KEY dans .env.local.",
    };
  }
  if (error instanceof Anthropic.BadRequestError) {
    return {
      message: "Les pages ont été refusées par le modèle.",
      hint: "Retire la page la plus lourde et relance.",
    };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return {
      message: "La connexion au modèle a été coupée.",
      hint: "Vérifie ta connexion et relance.",
    };
  }
  if (error instanceof Anthropic.APIError) {
    return {
      message: error.status ? `Le modèle a répondu ${error.status}.` : "Le modèle n'a pas répondu.",
      hint: "Relance la conversion.",
    };
  }
  return { message: "La conversion a échoué.", hint: "Relance la conversion." };
}

function json(event: ConvertEvent, status: number): Response {
  return new Response(JSON.stringify(event), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function streamOf(events: ConvertEvent[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) controller.enqueue(encodeEvent(event));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}
