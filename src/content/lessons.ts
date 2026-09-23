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
];
