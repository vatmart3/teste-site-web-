type Props = {
  children: React.ReactNode;
  color?: "jaune" | "rose";
  seed?: string;
  className?: string;
};

const FILL = {
  jaune: "var(--color-stabilo-jaune)",
  rose: "var(--color-stabilo-rose)",
};

/**
 * Un vrai trait de surligneur : rectangle légèrement incliné, bords irréguliers,
 * tracé DERRIÈRE le texte. Le jaune et le rose seulement — le bleu stylo ne
 * surligne jamais, il souligne, parce que du noir sur bleu ne passe pas AA.
 * Le tracé est dérivé de la graine, donc identique au serveur et au client.
 */
export function Highlight({ children, color = "jaune", seed = "", className }: Props) {
  const rand = seeded(seed);
  const top = 12 + rand() * 10;
  const bottom = 88 + rand() * 9;
  const path = [
    `M ${(-2 + rand() * 3).toFixed(2)} ${top.toFixed(2)}`,
    `C 24 ${(top - 7 + rand() * 6).toFixed(2)}, 62 ${(top + 5 - rand() * 8).toFixed(2)}, ${(101 + rand() * 2).toFixed(2)} ${(top + 1).toFixed(2)}`,
    `L ${(101 + rand() * 2).toFixed(2)} ${bottom.toFixed(2)}`,
    `C 66 ${(bottom + 6 - rand() * 5).toFixed(2)}, 27 ${(bottom - 4 + rand() * 7).toFixed(2)}, ${(-2 + rand() * 3).toFixed(2)} ${(bottom - 1).toFixed(2)}`,
    "Z",
  ].join(" ");
  const tilt = (-1.1 + rand() * 1.6).toFixed(2);

  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -inset-x-[0.18em] -inset-y-[0.08em] h-[calc(100%+0.16em)] w-[calc(100%+0.36em)]"
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        <path d={path} fill={FILL[color]} />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

function seeded(seed: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = (hash >>> 0) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}
