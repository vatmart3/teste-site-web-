import type { Conversion, MindMapNode } from "@/lib/schemas";

export function summaryMarkdown(conversion: Conversion): string {
  const { summary } = conversion;
  const lines: string[] = [`# ${summary.title}`, ""];
  const meta = [summary.subject, summary.level].filter(Boolean).join(" · ");
  if (meta) lines.push(`*${meta}*`, "");

  for (const section of summary.sections) {
    lines.push(`## ${section.heading}`, "");
    for (const paragraph of section.paragraphs) lines.push(paragraph, "");
    for (const term of section.keyTerms) lines.push(`**${term.term}** — ${term.definition}`, "");
    for (const formula of section.formulas) {
      lines.push("```", formula.latex, "```", "");
      if (formula.meaning) lines.push(formula.meaning, "");
    }
  }

  if (summary.keyPoints.length > 0) {
    lines.push("## À retenir", "");
    for (const point of summary.keyPoints) lines.push(`- ${point}`);
    lines.push("");
  }
  if (summary.commonMistakes.length > 0) {
    lines.push("## Pièges classiques", "");
    for (const mistake of summary.commonMistakes) lines.push(`- ${mistake}`);
    lines.push("");
  }

  lines.push("## Carte mentale", "");
  lines.push(...outline(conversion.mindmap.root as MindMapNode, 0));
  lines.push("");

  lines.push("## Fiches", "");
  for (const card of conversion.flashcards.cards) {
    lines.push(`**${card.front}**`, "", card.back, "");
  }

  return lines.join("\n");
}

function outline(node: MindMapNode, depth: number): string[] {
  const pad = "  ".repeat(depth);
  const detail = node.detail ? ` — ${node.detail}` : "";
  const children = (node.children ?? []) as MindMapNode[];
  return [
    `${pad}- ${node.label}${detail}`,
    ...children.flatMap((child) => outline(child, depth + 1)),
  ];
}
