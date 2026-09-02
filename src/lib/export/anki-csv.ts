import { prettyMath } from "@/lib/latex";
import type { Flashcard } from "@/lib/schemas";

/**
 * Anki : import « Texte séparé par des points-virgules », champs
 * Recto / Verso / Étiquettes. Le BOM force Excel et Numbers à lire de l'UTF-8.
 */
export function ankiCsv(cards: Flashcard[], subject: string): Blob {
  const rows = cards.map((card) => {
    const back = card.hint
      ? `${prettyMath(card.back)}<br><i>${prettyMath(card.hint)}</i>`
      : prettyMath(card.back);
    const tags = [subject, card.tag]
      .filter(Boolean)
      .map((tag) => tag.replace(/\s+/g, "_"))
      .join(" ");
    return [prettyMath(card.front), back, tags].map(escape).join(";");
  });
  const content = ["#separator:Semicolon", "#html:true", "#tags column:3", ...rows].join("\n");
  return new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
}

function escape(value: string): string {
  const cleaned = value.replace(/\r?\n/g, "<br>");
  if (/[";]/.test(cleaned)) return `"${cleaned.replace(/"/g, '""')}"`;
  return cleaned;
}
