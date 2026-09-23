/**
 * Bibliothèque de leçons d'associé : ce que le joueur apprend vraiment (comptabilité, droit, négociation).
 * Débloquées par les affaires ; exportables en PDF en phase 8.
 */
export interface Lesson {
  id: string;
  title: string;
  category: "Comptabilité" | "Droit" | "Négociation" | "Métier";
  /** Couleur de la reliure. */
  binding: string;
  paragraphs: string[];
  /** Le point à retenir, en une phrase. */
  takeaway: string;
}

export const LESSONS: Lesson[] = [
  {
    id: "billable-hour",
    title: "L'heure facturable",
    category: "Métier",
    binding: "#5a1e1e",
    paragraphs: [
      "Un cabinet d'affaires vend du temps. Chaque collaborateur note ses heures par tranches de six minutes (0,1 heure) et chaque tranche est rattachée à un dossier client.",
      "Le taux horaire dépend du rang : un stagiaire est facturé bien moins cher qu'un associé. Mais un client ne paie pas le temps passé, il paie la valeur produite : un travail rapide et juste vaut mieux qu'une nuit entière d'hésitations.",
      "Le taux de réalisation mesure la part des heures notées réellement payée par le client. Les heures « passées à apprendre » sont souvent effacées de la facture.",
    ],
    takeaway: "Le temps est la matière première du cabinet ; la précision est ce qui le rend facturable.",
  },
  {
    id: "read-balance-sheet",
    title: "Lire un bilan en cinq minutes",
    category: "Comptabilité",
    binding: "#1e3a5a",
    paragraphs: [
      "Commencez par comparer : un chiffre seul ne dit rien, deux exercices côte à côte disent presque tout.",
      "Regardez ensuite les variations qui ne vont pas ensemble. Des stocks qui grossissent bien plus vite que le chiffre d'affaires, des créances clients qui explosent, une durée d'amortissement qui s'allonge sans raison industrielle : ce sont des signaux.",
      "Enfin, lisez les annexes. Les changements de méthode comptable, les parties liées et les événements postérieurs à la clôture y sont décrits, souvent en petits caractères.",
    ],
    takeaway: "Les anomalies se cachent dans les écarts entre deux chiffres qui devraient bouger ensemble.",
  },
  {
    id: "cutoff",
    title: "Le cut-off : quand compter le revenu",
    category: "Comptabilité",
    binding: "#1e3a5a",
    paragraphs: [
      "La norme IFRS 15 (et son équivalent américain ASC 606) pose une règle simple : on comptabilise un revenu quand on transfère au client le contrôle du bien ou du service, pas quand on signe le contrat, ni quand on envoie la facture.",
      "Pour un contrat de transport sur plusieurs années, le revenu se reconnaît au fur et à mesure des trajets effectués. Tout passer en chiffre d'affaires le jour de la signature gonfle l'exercice en cours et vide les suivants.",
      "Le « cut-off » est le contrôle de la frontière entre deux exercices : on vérifie que chaque vente comptabilisée avant le 31 décembre correspond bien à une prestation rendue avant le 31 décembre. Les documents de terrain (bons de livraison, ordres de mission) sont les meilleurs témoins.",
    ],
    takeaway: "Un revenu se gagne en rendant le service ; une signature ne vaut pas une livraison.",
  },
  {
    id: "related-parties",
    title: "Les parties liées",
    category: "Droit",
    binding: "#3a1e3a",
    paragraphs: [
      "Une partie liée est une personne ou une société qui peut influencer l'entreprise ou être influencée par elle : dirigeants, administrateurs, actionnaires importants, sociétés qu'ils contrôlent.",
      "Les transactions avec elles ne sont pas interdites, mais elles doivent être déclarées en annexe (IAS 24) et conclues à des conditions normales. Des honoraires de « conseil » élevés, une avance sans intérêt ni garantie, un même administrateur des deux côtés : autant de signaux d'argent qui sort de l'entreprise.",
      "Dans une enquête, on suit le circuit : qui facture, qui paie, qui doit quoi à qui, et qui siège où.",
    ],
    takeaway: "Quand le même nom apparaît des deux côtés d'une facture, suivez l'argent.",
  },
  {
    id: "change-estimate",
    title: "Les changements d'estimation",
    category: "Comptabilité",
    binding: "#23402a",
    paragraphs: [
      "Les durées d'amortissement, les dépréciations ou les provisions reposent sur des estimations de la direction. Les changer est permis (IAS 8) si de nouvelles informations le justifient, de manière prospective.",
      "Mais une estimation se change avec des preuves : une étude technique, un historique d'utilisation, un avis d'expert. Allonger la vie des camions de 5 à 9 ans sans étude, l'année où les résultats doivent être beaux, c'est créer du bénéfice sans créer de valeur.",
      "Le recoupement est simple : si la flotte grossit mais que la dotation aux amortissements baisse, il faut une explication.",
    ],
    takeaway: "Un bénéfice qui vient d'un changement d'hypothèse n'est pas un bénéfice qui vient du métier.",
  },
  {
    id: "inventory",
    title: "Les stocks qui gonflent",
    category: "Comptabilité",
    binding: "#4a3a1e",
    paragraphs: [
      "Les stocks sont évalués au plus faible du coût et de la valeur nette de réalisation (IAS 2). Des pièces qui ne servent plus à rien doivent être dépréciées.",
      "Des stocks qui augmentent beaucoup plus vite que l'activité sont un signal classique : soit l'entreprise n'arrive plus à vendre, soit elle garde au bilan des articles sans valeur pour ne pas constater de perte.",
      "Le bon réflexe : comparer la croissance des stocks à celle du chiffre d'affaires, puis lire la note annexe sur les stocks, en particulier les petits caractères.",
    ],
    takeaway: "Des stocks qui courent plus vite que les ventes cachent souvent une perte qu'on n'a pas voulu voir.",
  },
  {
    id: "cross-examination",
    title: "Le contre-interrogatoire",
    category: "Droit",
    binding: "#2a2a4a",
    paragraphs: [
      "Au contre-interrogatoire, on ne cherche pas à apprendre quelque chose : on fait confirmer au témoin, question après question, ce que l'on sait déjà. Les questions sont courtes, fermées, précises : une date, un nom, un chiffre.",
      "On laisse le témoin s'engager sur une affirmation nette, puis on lui oppose la pièce qui la contredit. Une contradiction ne se plaide pas : elle se montre. Le jury fait le reste.",
      "Les questions agressives (« avouez que vous mentez ! ») font objecter la partie adverse et agacent le juge. La pression vient des faits, pas du ton.",
    ],
    takeaway: "Ne posez jamais une question dont vous ne connaissez pas la réponse — et gardez la pièce pour après la réponse.",
  },
  {
    id: "objections",
    title: "Les objections",
    category: "Droit",
    binding: "#4a1e2a",
    paragraphs: [
      "Une objection s'élève au moment où la question est posée, avant que le témoin ne réponde : une fois la réponse entendue par le jury, le mal est fait.",
      "Question suggestive : à l'interrogatoire principal, l'avocat ne peut pas souffler la réponse à son propre témoin (« vous êtes honnête, n'est-ce pas ? »). Ouï-dire : le témoin rapporte les paroles d'un tiers absent pour prouver qu'elles sont vraies. Spéculation : on demande au témoin ce que d'autres pensaient ou ce qui se serait passé.",
      "Objecter sans motif agace le juge : une objection se mérite, elle ne se lance pas au hasard.",
    ],
    takeaway: "Le bon motif, au bon moment : une objection tardive ou mal fondée coûte plus qu'elle ne rapporte.",
  },
];
