import { describe, expect, it } from "vitest";
import { buildMidnightAudit } from "./midnightAudit";
import { readFileSync } from "node:fs";

describe("export des voix", () => {
  it("les explications de l'export CSV sont celles de l'affaire", () => {
    const src = readFileSync("tools/export-voices.mts", "utf8");
    for (const a of buildMidnightAudit(0).anomalies) expect(src).toContain(a.explanation);
  });
});
