"use client";
import dynamic from "next/dynamic";

// Le moteur dépend de WebGL / Web Audio : rendu uniquement côté client.
const Game = dynamic(() => import("./Game"), { ssr: false, loading: () => <div className="fixed inset-0 bg-ink" /> });

export default function GameClient() {
  return <Game />;
}
