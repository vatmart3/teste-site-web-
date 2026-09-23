import { describe, expect, it } from "vitest";
import { manifestFrom, resolveAudio, resolveCharacterVideo, resolvePlate, resolvePlayerPortrait } from "./manifest";

describe("resolvePlate", () => {
  const m = manifestFrom([
    "scenes/03-lobby.avif",
    "scenes/03-lobby@1280.avif",
    "scenes/03-lobby.depth.png",
    "scenes/03-lobby.webm",
    "scenes/03-lobby.layer-column.png",
    "scenes/06a-openspace.webp",
    "scenes/06a-openspace.depth.png",
  ]);

  it("prend la version desktop en AVIF", () => {
    const p = resolvePlate(m, "03-lobby");
    expect(p.color).toBe("/scenes/03-lobby.avif");
    expect(p.depth).toBe("/scenes/03-lobby.depth.png");
    expect(p.video).toEqual({ webm: "/scenes/03-lobby.webm", mp4: null });
  });
  it("prend la version 1280 px sur mobile", () => {
    expect(resolvePlate(m, "03-lobby", { mobile: true }).color).toBe("/scenes/03-lobby@1280.avif");
  });
  it("retombe sur la lumière de jour si la variante manque", () => {
    const p = resolvePlate(m, "06a-openspace", { variant: "night" });
    expect(p.color).toBe("/scenes/06a-openspace.webp");
    expect(p.depth).toBe("/scenes/06a-openspace.depth.png");
  });
  it("résout les calques", () => {
    const p = resolvePlate(m, "03-lobby", { layers: ["03-lobby.layer-column", "03-lobby.layer-x"] });
    expect(p.layers).toEqual({ "03-lobby.layer-column": "/scenes/03-lobby.layer-column.png", "03-lobby.layer-x": null });
  });
  it("renvoie null quand rien n'existe (→ plate procédurale)", () => {
    expect(resolvePlate(m, "01-taxi-night").color).toBeNull();
  });
});

describe("resolveAudio", () => {
  it("préfère WebM puis MP3", () => {
    const m = manifestFrom(["audio/sfx-gavel.mp3", "audio/sfx-gavel.webm"]);
    expect(resolveAudio(m, "sfx-gavel")).toBe("/audio/sfx-gavel.webm");
    expect(resolveAudio(m, "sfx-stamp")).toBeNull();
  });
});

describe("personnages", () => {
  const m = manifestFrom(["characters/rourke-tense.mp4", "characters/player-2.webp"]);
  it("trouve les vidéos d'état", () => {
    expect(resolveCharacterVideo(m, "rourke", "tense")).toEqual({ webm: null, mp4: "/characters/rourke-tense.mp4" });
    expect(resolveCharacterVideo(m, "rourke", "idle")).toBeNull();
  });
  it("trouve les portraits du joueur (1 à 6)", () => {
    expect(resolvePlayerPortrait(m, 1)).toBe("/characters/player-2.webp");
    expect(resolvePlayerPortrait(m, 0)).toBeNull();
  });
});
