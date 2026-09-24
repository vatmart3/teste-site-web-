/** Répliques de l'étage (monde ouvert) : services, conseils, piques, rumeurs. IP originale. */

export const W = {
  enterFirst: "Votre étage. Marchez (ZQSD ou flèches), approchez-vous des gens et appuyez sur E. Votre bureau est au nord, derrière la cloison vitrée.",
  objectiveFirst: "Faites le tour de l'étage · parlez à Theo, votre assistant",
  objectiveDesk: "Asseyez-vous à votre bureau pour ouvrir un dossier",
  objectiveHarlow: "Harlow vous attend · bureau d'angle, à l'ouest",
  theo: {
    hello: ["Vous avez besoin de quelque chose ?", "Je vous écoute.", "Oui ? Je note."],
    coffeeYes: "Un double, sans sucre. Je reviens.",
    coffeeHere: "Et voilà. Brûlant, comme le dossier Meridian.",
    fileYes: "Je descends aux archives. Deux minutes.",
    fileHere: "Le dossier est sur votre bureau. J'ai surligné ce qui compte. Enfin, j'ai essayé.",
    tipIntro: "Un conseil ? J'en ai toujours un.",
    tips: [
      "Au tribunal, n'objectez que si la question est vraiment irrégulière. La juge Whitford déteste perdre son temps.",
      "Sur le tableau, ne tirez un fil que si deux pièces se contredisent vraiment. Harlow compte les erreurs.",
      "Les heures se facturent par tranches de six minutes. Mercer arrondit toujours au-dessus. Ne faites pas comme lui.",
      "Vivian sait tout avant tout le monde. Si vous voulez voir Harlow, passez par elle.",
    ],
    bye: "Je suis à mon poste.",
  },
  vivian: {
    hello: ["Oui, maître ?", "Vous avez l'air perdu. C'est normal, ça passe.", "Il vous a à l'œil. Dans le bon sens, pour l'instant."],
    harlowYes: "Il a cinq minutes. Pas six. Allez-y.",
    harlowBusy: "Il est au téléphone avec Tokyo. Repassez plus tard.",
    gossip: [
      "Mercer a raté son examen de la déontologie la première fois. Vous ne l'avez pas entendu de moi.",
      "Vance revient de Londres la semaine prochaine. Rangez votre bureau.",
      "Harlow écoute du jazz quand il réfléchit. S'il met Coltrane, n'entrez pas.",
      "Nora connaît le prénom de tous les coursiers de Manhattan. Soyez gentil avec Nora.",
    ],
  },
  harlow: {
    hello: "Entrez. Fermez la porte.",
    talk: [
      "Dans ce métier, on ne gagne pas avec les réponses. On gagne avec les questions que l'autre n'a pas vues venir.",
      "Je ne vous demande pas d'avoir toujours raison. Je vous demande de savoir pourquoi vous avez tort.",
      "Un bon avocat lit le dossier. Un grand avocat lit la personne en face.",
    ],
    bye: "Au travail.",
  },
  nora: {
    hello: ["Harlow & Vance, que puis-je… ah, c'est vous !", "Bonjour ! Café ? Non, je plaisante, demandez à Theo."],
    messages: (n: number) => (n > 0 ? `Vous avez ${n} message${n > 1 ? "s" : ""} vocal${n > 1 ? "aux" : ""} sur votre ligne. Écoutez-les depuis votre bureau.` : "Pas de message pour vous. Profitez-en."),
    who: "Harlow est dans son bureau, Mercer fait semblant de travailler, et la salle de conférence est libre.",
  },
  mercer: {
    hello: ["Tiens. Le prodige.", "Tu cherches les toilettes ? C'est tout droit, après ta carrière.", "Oh, c'est toi."],
    jab: [
      "Harlow t'aime bien. Profites-en, ça ne dure jamais.",
      "Mon premier dossier, je l'ai gagné en deux jours. Toi, tu en es où ?",
      "Belle cravate. Enfin, c'est une cravate.",
    ],
    back: ["Moi au moins, je facture mes heures.", "On verra qui aura le bureau d'angle.", "Retourne à ta photocopieuse."],
  },
  priya: {
    hello: ["Salut ! Tu cherches quelque chose ?", "Les archives m'adorent. C'est réciproque."],
    researchYes: "Une jurisprudence ? Donne-moi une minute, je file aux archives.",
    researchHere: "Voilà : trois arrêts qui disent exactement ce que tu veux. Tu me devras un café.",
    researchDone: "J'ai déjà vidé les archives pour toi aujourd'hui. Demain !",
  },
  sam: {
    hello: ["Salut ! Tu survis ?", "Ça va, ça va. Mercer m'a encore piqué mon agrafeuse."],
    talk: [
      "Le secret ici : dormir au bureau, mais jamais devant Harlow.",
      "Si tu gagnes ton premier procès, on fête ça au bar d'en face. C'est la tradition.",
    ],
  },
  lena: {
    hello: ["Bonjour ! Tu as une minute ?", "Tu as vu la vue d'ici au coucher du soleil ?"],
    talk: ["Relis toujours les dates. Les gens mentent, les dates rarement.", "Ne laisse jamais Mercer relire tes conclusions."],
  },
  marcus: {
    hello: ["Courrier ! Enfin, pas encore.", "Salut, maître. Belle journée pour les photocopies."],
    mailYes: "Je regarde dans votre casier. Bougez pas.",
    mailHere: (n: number) => (n > 0 ? `Voilà votre courrier. Et vous avez ${n} message${n > 1 ? "s" : ""} vocal${n > 1 ? "aux" : ""}, d'après Nora.` : "Voilà. Rien d'urgent, rien de grave. Le rêve."),
  },
  guard: { hello: ["Bonsoir.", "Tout est calme."] },
  extra: ["Pas maintenant, j'ai une audience.", "Bonjour !", "Je termine un mémo, désolé.", "Salut."],
  coffeeSelf: "Un espresso serré. La journée peut continuer.",
  coffeeBuff: "Concentration : votre prochain dossier rapporte 15 % d'honoraires en plus.",
  elevator: "L'ascenseur descend vers le hall. Pas avant d'avoir facturé vos heures.",
  archives: "Vous épluchez de vieux dossiers. Une demi-heure facturée à la recherche.",
  vance: "Le bureau de M. Vance. Des housses sur les fauteuils, un globe, et une odeur de cuir neuf. Il est à Londres.",
};

export function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!;
}
