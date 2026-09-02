/**
 * Le modèle renvoie du LaTeX brut. Afficher « \sum F_{ext} = m \cdot a » à un
 * lycéen, c'est lui montrer du code. On le rend en Unicode : pas de moteur de
 * rendu mathématique à charger, et la même chaîne part telle quelle dans les
 * exports. Le LaTeX d'origine reste dans l'export Markdown, où il a sa place.
 */

const SYMBOLS: [RegExp, string][] = [
  [/\\left|\\right|\\!|\\,|\\;|\\quad|\\qquad|\\displaystyle|\\text/g, ""],
  [/\\times/g, "×"],
  [/\\div/g, "÷"],
  [/\\cdot/g, "·"],
  [/\\pm/g, "±"],
  [/\\mp/g, "∓"],
  [/\\leq|\\le\b/g, "≤"],
  [/\\geq|\\ge\b/g, "≥"],
  [/\\neq|\\ne\b/g, "≠"],
  [/\\approx/g, "≈"],
  [/\\equiv/g, "≡"],
  [/\\propto/g, "∝"],
  [/\\infty/g, "∞"],
  [/\\rightarrow|\\to\b/g, "→"],
  [/\\leftarrow/g, "←"],
  [/\\Rightarrow/g, "⇒"],
  [/\\Leftrightarrow|\\iff/g, "⇔"],
  [/\\partial/g, "∂"],
  [/\\nabla/g, "∇"],
  [/\\sum/g, "Σ"],
  [/\\prod/g, "Π"],
  [/\\int/g, "∫"],
  [/\\in\b/g, "∈"],
  [/\\notin/g, "∉"],
  [/\\subset/g, "⊂"],
  [/\\cup/g, "∪"],
  [/\\cap/g, "∩"],
  [/\\forall/g, "∀"],
  [/\\exists/g, "∃"],
  [/\\emptyset|\\varnothing/g, "∅"],
  [/\\ldots|\\dots|\\cdots/g, "…"],
  [/\\degree|\\circ\b/g, "°"],
  [/\\%/g, "%"],
];

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ",
  lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ",
  tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π",
  Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶",
  "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "n": "ⁿ", "i": "ⁱ",
};

const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆",
  "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "a": "ₐ", "e": "ₑ",
  "i": "ᵢ", "n": "ₙ", "o": "ₒ", "x": "ₓ",
};

export function prettyMath(input: string): string {
  let out = input.trim();
  out = out.replace(/^\$+|\$+$/g, "").replace(/^\\\[|\\\]$/g, "");

  out = out.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a: string, b: string) =>
    `(${a})/(${b})`,
  );
  out = out.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_, a: string) => `√(${a})`);
  out = out.replace(/\\vec\s*\{([^{}]*)\}/g, (_, a: string) => `${a}⃗`);
  out = out.replace(/\\overrightarrow\s*\{([^{}]*)\}/g, (_, a: string) => `${a}⃗`);

  out = out.replace(/\\([A-Za-z]+)/g, (match, name: string) => GREEK[name] ?? match);
  for (const [pattern, replacement] of SYMBOLS) out = out.replace(pattern, replacement);

  out = out.replace(/\^\s*\{([^{}]*)\}|\^(\w)/g, (_, braced: string | undefined, single: string | undefined) =>
    script(braced ?? single ?? "", SUP, "^"),
  );
  out = out.replace(/_\s*\{([^{}]*)\}|_(\w)/g, (_, braced: string | undefined, single: string | undefined) =>
    script(braced ?? single ?? "", SUB, "_"),
  );

  out = out.replace(/[{}]/g, "").replace(/\s{2,}/g, " ").trim();
  return out;
}

function script(content: string, table: Record<string, string>, fallback: string): string {
  const mapped = [...content].map((char) => table[char]);
  if (mapped.every((value) => value !== undefined)) return mapped.join("");
  return `${fallback}(${content})`;
}
