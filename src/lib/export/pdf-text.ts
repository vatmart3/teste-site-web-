import type { PDFFont } from "pdf-lib";

/**
 * Les polices standard PDF sont encodées en WinAnsi : les accents français
 * passent, l'alphabet grec non. Plutôt que de planter à l'export, on translittère
 * ce qui est courant en cours de sciences et on remplace le reste.
 */
const REPLACEMENTS: Record<string, string> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", ζ: "zeta",
  η: "eta", θ: "theta", λ: "lambda", μ: "mu", ν: "nu", ξ: "xi", π: "pi",
  ρ: "rho", σ: "sigma", τ: "tau", φ: "phi", χ: "chi", ψ: "psi", ω: "omega",
  Γ: "Gamma", Δ: "Delta", Θ: "Theta", Λ: "Lambda", Ξ: "Xi", Π: "Pi",
  Σ: "Sigma", Φ: "Phi", Ψ: "Psi", Ω: "Omega",
  "≤": "<=", "≥": ">=", "≠": "!=", "≈": "~=", "→": "->", "←": "<-",
  "⇒": "=>", "⇔": "<=>", "∈": " appartient a ", "∉": " n'appartient pas a ",
  "∀": "pour tout ", "∃": "il existe ", "∞": "infini", "√": "racine de ",
  "∑": "somme", "∏": "produit", "∫": "integrale", "∂": "d", "±": "+/-",
  "×": "x", "÷": "/", "·": ".", "≡": "==", "∅": "vide", "⊂": " inclus dans ",
  "∩": " inter ", "∪": " union ", "°": " deg", "€": "EUR",
  "‘": "'", "’": "'", "“": '"', "”": '"',
  "∓": "-/+", "∝": " proportionnel a ", "∇": "nabla", "⃗": "(vecteur)",
  "–": "-", "—": "-", "…": "...", " ": " ", " ": " ",
};

const WIN_ANSI_EXTRA = new Set("\u20AC\u201A\u0192\u201E\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2022\u02DC\u2122\u0161\u203A\u0153\u017E\u0178");

function encodable(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  if (code >= 0x20 && code <= 0x7e) return true;
  if (code >= 0xa0 && code <= 0xff) return true;
  if (code >= 0x80 && code <= 0x9f) return true;
  return WIN_ANSI_EXTRA.has(char);
}

const SUP_UNI = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿⁱ";
const SUP_ASCII = "0123456789+-ni";
const SUB_UNI = "₀₁₂₃₄₅₆₇₈₉₊₋ₐₑᵢₙₒₓ";
const SUB_ASCII = "0123456789+-aeinox";

function flatten(run: string, uni: string, ascii: string, mark: string): string {
  return mark + [...run].map((char) => ascii[uni.indexOf(char)] ?? "").join("");
}

export function sanitize(input: string): string {
  // Les exposants et indices sont aplatis par suites entières : « m.s^-2 »
  // et non « m.s^-^2 ». Et un caractère déjà encodé en WinAnsi (128-159)
  // repasse sans dommage, pour que sanitize reste idempotent.
  const prepared = input
    .replace(new RegExp(`[${SUP_UNI}]+`, "g"), (run) => flatten(run, SUP_UNI, SUP_ASCII, "^"))
    .replace(new RegExp(`[${SUB_UNI}]+`, "g"), (run) => flatten(run, SUB_UNI, SUB_ASCII, "_"));

  let out = "";
  for (const char of prepared) {
    const mapped = REPLACEMENTS[char];
    if (mapped !== undefined) {
      out += mapped;
      continue;
    }
    out += encodable(char) ? char : "?";
  }
  return out.replace(/\?{2,}/g, "?");
}

export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const clean = sanitize(text).replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let piece = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(piece + char, size) > maxWidth) {
          lines.push(piece);
          piece = char;
        } else {
          piece += char;
        }
      }
      current = piece;
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Réduit la taille de police jusqu'à ce que le texte tienne dans la boîte. */
export function fitText(
  text: string,
  font: PDFFont,
  maxWidth: number,
  maxHeight: number,
  startSize: number,
  minSize: number,
): { size: number; lines: string[] } {
  let size = startSize;
  for (;;) {
    const lines = wrapText(text, font, size, maxWidth);
    if (lines.length * size * 1.32 <= maxHeight || size <= minSize) {
      return { size, lines };
    }
    size -= 0.5;
  }
}
