import { describe, expect, it } from "vitest";
import { caseStatus, CASES } from "./cases";
import { inbox, unreadCount } from "./messages";
import { LESSONS } from "./lessons";
import { PERKS } from "./perks";

describe("affaires", () => {
  it("6 affaires, les 3 premières gratuites", () => {
    expect(CASES).toHaveLength(6);
    expect(CASES.filter((c) => c.free).map((c) => c.number)).toEqual([1, 2, 3]);
  });
  it("statuts affichés", () => {
    const c1 = CASES[0]!;
    const c4 = CASES[3]!;
    expect(caseStatus(c1, undefined, false, 4)).toBe("available");
    expect(caseStatus(c1, undefined, false, 3)).toBe("soon");
    expect(caseStatus(c1, { completed: true, grade: "A" }, false, 3)).toBe("completed");
    expect(caseStatus(c4, undefined, false, 9)).toBe("sealed");
    expect(caseStatus(c4, undefined, true, 9)).toBe("available");
  });
});

describe("messagerie", () => {
  it("rien avant l'arrivée", () => {
    expect(inbox({ flags: {}, arrivalSeen: false })).toHaveLength(0);
  });
  it("le SMS de Mercer dépend du choix de l'arrivée", () => {
    const a = inbox({ flags: { mercer_intro: "retort" }, arrivalSeen: true }).find((m) => m.id === "sms-mercer-intro");
    const b = inbox({ flags: { mercer_intro: "smile" }, arrivalSeen: true }).find((m) => m.id === "sms-mercer-intro");
    expect(a && a.kind === "sms" && a.text).toContain("fenêtre");
    expect(b && b.kind === "sms" && b.text).toContain("conseil");
  });
  it("compte les non-lus", () => {
    const c = { flags: { mercer_intro: "ignore" }, arrivalSeen: true };
    expect(unreadCount(c, [])).toBe(4);
    expect(unreadCount(c, ["vm-harlow-desk", "sms-nora-coffee"])).toBe(2);
  });
});

describe("contenus", () => {
  it("ids uniques", () => {
    for (const list of [PERKS, LESSONS, CASES]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
