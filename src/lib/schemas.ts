import { z } from "zod";

/**
 * Deux niveaux de schéma :
 *  - `modelOutputJsonSchema` : le JSON Schema envoyé au modèle (structured output).
 *    Tout y est requis et sans contrainte exotique, parce qu'un schéma permissif
 *    se décode plus vite et échoue moins souvent qu'un schéma bavard.
 *  - les schémas zod ci-dessous : la validation réelle, côté serveur, de ce qui
 *    revient. C'est eux qui font autorité.
 */

export const keyTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
});

export const formulaSchema = z.object({
  latex: z.string().min(1),
  meaning: z.string().default(""),
});

export const sectionSchema = z.object({
  heading: z.string().min(1),
  paragraphs: z.array(z.string()).default([]),
  keyTerms: z.array(keyTermSchema).default([]),
  formulas: z.array(formulaSchema).default([]),
});

export const summarySchema = z.object({
  subject: z.string().default("Cours"),
  level: z.string().default(""),
  title: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
  keyPoints: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()).default([]),
});

/** Profondeur maximale 4, imposée par la structure et non par une règle molle. */
const nodeLeaf = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string().default(""),
});
const node4 = nodeLeaf;
const node3 = nodeLeaf.extend({ children: z.array(node4).default([]) });
const node2 = nodeLeaf.extend({ children: z.array(node3).default([]) });
const node1 = nodeLeaf.extend({ children: z.array(node2).default([]) });

export const mindMapSchema = z.object({ root: node1 });

export const cardSchema = z.object({
  id: z.string(),
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().default(""),
  difficulty: z.number().int().min(1).max(3).catch(2),
  tag: z.string().default(""),
});

export const flashcardsSchema = z.object({
  cards: z.array(cardSchema).min(4),
});

export const pageIssueSchema = z.object({
  page: z.number().int().min(1),
  problem: z.string().min(1),
  advice: z.string().min(1),
});

export const conversionSchema = z.object({
  language: z.string().default("fr"),
  pageIssues: z.array(pageIssueSchema).default([]),
  summary: summarySchema,
  mindmap: mindMapSchema,
  flashcards: flashcardsSchema,
});

export type Summary = z.infer<typeof summarySchema>;
export type MindMap = z.infer<typeof mindMapSchema>;
export type MindMapNode = z.infer<typeof node1>;
export type Flashcards = z.infer<typeof flashcardsSchema>;
export type Flashcard = z.infer<typeof cardSchema>;
export type PageIssue = z.infer<typeof pageIssueSchema>;
export type Conversion = z.infer<typeof conversionSchema>;

/** Version partielle, telle qu'elle arrive pendant le streaming. */
export type PartialConversion = {
  language?: string;
  pageIssues?: Partial<PageIssue>[];
  summary?: DeepPartial<Summary>;
  mindmap?: DeepPartial<MindMap>;
  flashcards?: { cards?: Partial<Flashcard>[] };
};

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

const str = { type: "string" } as const;
const strArray = { type: "array", items: str } as const;

function nodeJson(depth: number): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    id: str,
    label: str,
    detail: str,
  };
  const required = ["id", "label", "detail"];
  if (depth > 1) {
    properties.children = { type: "array", items: nodeJson(depth - 1) };
    required.push("children");
  }
  return { type: "object", properties, required, additionalProperties: false };
}

/** Le JSON Schema transmis au modèle. L'ordre des clés est l'ordre de génération :
 *  les défauts de lisibilité d'abord (c'est un veto), le résumé ensuite (c'est ce
 *  que l'étudiant lit en premier), la carte et les fiches après. */
export const modelOutputJsonSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    language: str,
    pageIssues: {
      type: "array",
      items: {
        type: "object",
        properties: { page: { type: "integer" }, problem: str, advice: str },
        required: ["page", "problem", "advice"],
        additionalProperties: false,
      },
    },
    summary: {
      type: "object",
      properties: {
        subject: str,
        level: str,
        title: str,
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: str,
              paragraphs: strArray,
              keyTerms: {
                type: "array",
                items: {
                  type: "object",
                  properties: { term: str, definition: str },
                  required: ["term", "definition"],
                  additionalProperties: false,
                },
              },
              formulas: {
                type: "array",
                items: {
                  type: "object",
                  properties: { latex: str, meaning: str },
                  required: ["latex", "meaning"],
                  additionalProperties: false,
                },
              },
            },
            required: ["heading", "paragraphs", "keyTerms", "formulas"],
            additionalProperties: false,
          },
        },
        keyPoints: strArray,
        commonMistakes: strArray,
      },
      required: ["subject", "level", "title", "sections", "keyPoints", "commonMistakes"],
      additionalProperties: false,
    },
    mindmap: {
      type: "object",
      properties: { root: nodeJson(4) },
      required: ["root"],
      additionalProperties: false,
    },
    flashcards: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: str,
              front: str,
              back: str,
              hint: str,
              difficulty: { type: "integer" },
              tag: str,
            },
            required: ["id", "front", "back", "hint", "difficulty", "tag"],
            additionalProperties: false,
          },
        },
      },
      required: ["cards"],
      additionalProperties: false,
    },
  },
  required: ["language", "pageIssues", "summary", "mindmap", "flashcards"],
  additionalProperties: false,
};
