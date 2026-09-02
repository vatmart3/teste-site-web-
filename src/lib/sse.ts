import type { Conversion, PartialConversion } from "./schemas";

export type ConvertStep =
  | "upload"
  | "read"
  | "summary"
  | "mindmap"
  | "flashcards"
  | "done";

export type ConvertEvent =
  | { type: "step"; step: ConvertStep }
  | { type: "cached" }
  | { type: "partial"; data: PartialConversion }
  | { type: "done"; data: Conversion; elapsedMs: number; today: number }
  | { type: "error"; message: string; hint?: string };

const encoder = new TextEncoder();

export function encodeEvent(event: ConvertEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/** Lit un flux SSE et rend les événements un par un. */
export async function* readEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ConvertEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf("\n\n");
    while (index !== -1) {
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (line) {
        try {
          yield JSON.parse(line.slice(6)) as ConvertEvent;
        } catch {
          // événement tronqué, on l'ignore
        }
      }
      index = buffer.indexOf("\n\n");
    }
  }
}
