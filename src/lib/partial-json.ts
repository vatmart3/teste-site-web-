/**
 * Parseur JSON tolérant : referme ce qui est ouvert pour rendre lisible un JSON
 * encore en cours de génération. C'est ce qui permet d'afficher le résumé
 * pendant que le modèle écrit encore les fiches.
 */
export function parsePartialJson<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // on continue, il manque probablement la fin
  }

  const repaired = repair(trimmed);
  if (repaired === null) return null;
  try {
    return JSON.parse(repaired) as T;
  } catch {
    return null;
  }
}

function repair(text: string): string | null {
  const stack: ("}" | "]")[] = [];
  let inString = false;
  let escaped = false;
  let lastComplete = -1; // dernier index où la structure est refermable proprement

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === undefined) break;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') {
        inString = false;
        lastComplete = i;
      }
      continue;
    }
    switch (ch) {
      case '"':
        inString = true;
        break;
      case "{":
        stack.push("}");
        break;
      case "[":
        stack.push("]");
        break;
      case "}":
      case "]":
        stack.pop();
        lastComplete = i;
        break;
      case ",":
      case ":":
        break;
      default:
        if (!/\s/.test(ch)) lastComplete = i;
    }
  }

  let body = text;
  if (inString) {
    // on coupe la chaîne en cours : mieux vaut un mot manquant qu'un JSON cassé
    body = text.slice(0, lastComplete + 1);
    if (escaped) body = body.slice(0, -1);
    body += '"';
  } else {
    body = text.slice(0, lastComplete + 1);
  }

  // une clé orpheline (`"heading":`) ou une virgule finale casserait le parse
  body = body.replace(/,\s*$/, "");
  const orphanKey = /"[^"]*"\s*:\s*$/;
  if (orphanKey.test(body)) {
    body = body.replace(orphanKey, "").replace(/,\s*$/, "");
  }
  if (/[:,[{]\s*$/.test(body) && !/[[{]\s*$/.test(body)) {
    body = body.replace(/[:,]\s*$/, "");
    body = body.replace(/"[^"]*"\s*$/, "");
    body = body.replace(/,\s*$/, "");
  }

  if (!body) return null;
  for (let i = stack.length - 1; i >= 0; i -= 1) body += stack[i];
  return body;
}
