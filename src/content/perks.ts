/** Atouts à usage unique, rangés dans la mallette. */
export interface PerkDef {
  id: string;
  name: string;
  effect: string;
  flavor: string;
  /** Couleur de la carte. */
  color: string;
  icon: "coffee" | "microscope" | "eye" | "key" | "mask";
}

export const PERKS: PerkDef[] = [
  { id: "all-nighter", name: "Nuit blanche", effect: "+30 secondes au chrono d'une épreuve.", flavor: "Le quatrième café est toujours le meilleur.", color: "#7a4a1e", icon: "coffee" },
  { id: "expert", name: "Expert judiciaire", effect: "Révèle une anomalie cachée dans les comptes.", flavor: "Deux cents dollars de l'heure, et il ne se trompe jamais.", color: "#1f4a6b", icon: "microscope" },
  { id: "investigator", name: "Enquêteur privé", effect: "Ajoute une pièce cachée au dossier.", flavor: "Ne demandez pas comment il l'a obtenue.", color: "#3a3a3a", icon: "eye" },
  { id: "clerk", name: "Contact au greffe", effect: "Rend visible la patience de la juge.", flavor: "Elle adore les croissants du 51.", color: "#5a2a4a", icon: "key" },
  { id: "poker-face", name: "Poker face", effect: "Un bluff réussi à coup sûr pendant une négociation.", flavor: "Votre visage ne dit rien. Votre compte en banque, si.", color: "#1f1f24", icon: "mask" },
];
