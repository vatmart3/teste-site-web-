"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type QualitySetting = "auto" | "high" | "medium" | "css";
export type MotionSetting = "auto" | "reduced" | "full";

export interface Settings {
  master: number;
  music: number;
  voice: number;
  sfx: number;
  muted: boolean;
  subtitles: boolean;
  textScale: number;
  motion: MotionSetting;
  quality: QualitySetting;
  /** Parallaxe au gyroscope sur mobile (après autorisation). */
  gyro: boolean;
  set: (patch: Partial<Omit<Settings, "set">>) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      master: 0.9,
      music: 0.6,
      voice: 1,
      sfx: 0.9,
      muted: false,
      subtitles: true,
      textScale: 1,
      motion: "auto",
      quality: "auto",
      gyro: false,
      set: (patch) => set(patch),
    }),
    { name: "bh-settings", version: 1 },
  ),
);
