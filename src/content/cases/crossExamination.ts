/**
 * Affaire 2 — « Le contre-interrogatoire ». Tribunal fédéral du district sud de New York, salle 14B.
 * Le fonds de pension des chauffeurs poursuit Meridian ; Daniel Rourke, directeur financier, témoigne.
 *
 * 1. Interrogatoire principal par Celia Brandt : trois questions contestables à relever au bon moment
 *    (suggestive, ouï-dire, spéculation), deux questions régulières (objecter serait une erreur).
 * 2. Contre-interrogatoire par le joueur : quatre sujets, trois questions par sujet ; Rourke affirme,
 *    le joueur lui oppose une pièce du dossier (établie sur le tableau d'enquête) ou passe.
 */
import type { CourtCaseDef } from "@/engine/court/types";

export const CROSS_EXAMINATION: CourtCaseDef = {
  id: "cross-examination",
  title: "Le contre-interrogatoire",
  hourlyRate: 240,
  hearingHours: 6.5,
  breakAt: 85,
  direct: [
    {
      id: "d-tenure",
      speaker: "brandt",
      text: "Monsieur Rourke, depuis combien de temps êtes-vous directeur financier de Meridian Logistics ?",
    },
    { id: "d-tenure-a", speaker: "rourke", text: "Onze ans. J'ai signé chacun de nos rapports annuels depuis 2014.", state: "pleased" },
    {
      id: "d-honest",
      speaker: "brandt",
      text: "Vous êtes un homme intègre, qui n'a jamais maquillé le moindre chiffre de sa carrière, n'est-ce pas ?",
      objection: { ground: "leading", from: 0.2, to: 1, why: "Elle souffle la réponse à son propre témoin : c'est une question suggestive, interdite à l'interrogatoire principal." },
    },
    { id: "d-honest-a", speaker: "rourke", text: "Jamais. Pas une seule fois.", state: "pleased" },
    {
      id: "d-auditor",
      speaker: "brandt",
      text: "Et votre commissaire aux comptes vous a personnellement assuré que tout était conforme, je crois ?",
      objection: { ground: "hearsay", from: 0.25, to: 1, why: "Elle fait rapporter par le témoin les paroles d'un tiers absent pour prouver qu'elles sont vraies : c'est du ouï-dire." },
    },
    { id: "d-auditor-a", speaker: "rourke", text: "Il me l'a dit, oui. Mot pour mot." },
    {
      id: "d-drivers",
      speaker: "brandt",
      text: "Selon vous, que pensaient les chauffeurs du fonds de pension quand ils ont investi chez nous ?",
      objection: { ground: "speculation", from: 0.1, to: 1, why: "Le témoin ne peut pas savoir ce que pensaient d'autres personnes : on lui demande de spéculer." },
    },
    { id: "d-drivers-a", speaker: "rourke", text: "Qu'ils faisaient le meilleur placement de leur vie. Et ils avaient raison." },
    {
      id: "d-fleet",
      speaker: "brandt",
      text: "Combien de camions compte aujourd'hui la flotte de Meridian ?",
    },
    { id: "d-fleet-a", speaker: "rourke", text: "Un peu plus de quatre mille tracteurs routiers." },
    { id: "d-end", speaker: "brandt", text: "Merci. Plus de questions, Votre Honneur. Le témoin est à vous, maître.", state: "pleased" },
  ],
  topics: [
    {
      id: "t-revenue",
      title: "Le contrat Halvorsen",
      questions: [
        { id: "q-rev-1", label: "« Quand, exactement, le contrat Halvorsen a-t-il été signé ? »", style: "precise" },
        { id: "q-rev-2", label: "« Parlez-nous de vos relations avec Halvorsen. »", style: "open" },
        { id: "q-rev-3", label: "« Vous avez inventé ce chiffre d'affaires, avouez-le ! »", style: "aggressive" },
      ],
      claim: "Fin décembre. Le contrat était signé, la facture émise, le revenu acquis : tout a été comptabilisé dans l'exercice, en règle.",
      contradictedBy: "p-contract",
      rebuttal: "Le 3 janvier ? C'est… c'est la date de la contresignature norvégienne. L'accord de principe datait de décembre.",
      finding: "Revenu comptabilisé avant la signature",
      pressure: 28,
    },
    {
      id: "t-orca",
      title: "Orca Partners",
      questions: [
        { id: "q-orca-1", label: "« Meridian a-t-elle un lien quelconque avec Orca Partners ? »", style: "precise" },
        { id: "q-orca-2", label: "« Qui choisit vos prestataires de conseil ? »", style: "open" },
        { id: "q-orca-3", label: "« Combien avez-vous détourné par Orca ? »", style: "aggressive" },
      ],
      claim: "Aucun. Orca est un cabinet indépendant, choisi sur appel d'offres. Je n'ai aucun lien personnel avec eux.",
      contradictedBy: "p-orca",
      rebuttal: "Linda… Ma femme gère beaucoup de sociétés. Je ne suis pas au courant de toutes.",
      finding: "Partie liée dissimulée",
      pressure: 30,
    },
    {
      id: "t-fleet",
      title: "La durée de vie des camions",
      questions: [
        { id: "q-fleet-1", label: "« Combien d'années vos camions restent-ils réellement en service ? »", style: "precise" },
        { id: "q-fleet-2", label: "« Pourquoi avoir changé vos méthodes comptables ? »", style: "open" },
        { id: "q-fleet-3", label: "« Vous trichez sur les amortissements depuis des années ! »", style: "aggressive" },
      ],
      claim: "Neuf ans. Nos tracteurs roulent neuf ans, c'est notre expérience du terrain : j'ai simplement aligné les comptes sur la réalité.",
      contradictedBy: "p-maintenance",
      rebuttal: "Cinq ans… Ce rapport ne tient pas compte des… des révisions lourdes. Je… je ne l'avais pas lu.",
      finding: "Amortissements gonflés",
      pressure: 24,
    },
    {
      id: "t-bond",
      title: "L'emprunt obligataire",
      questions: [
        { id: "q-bond-1", label: "« À quoi a servi l'emprunt obligataire de mars ? »", style: "precise" },
        { id: "q-bond-2", label: "« Parlez-nous de la dette de Meridian. »", style: "open" },
        { id: "q-bond-3", label: "« Vous avez endetté l'entreprise pour vous enrichir ! »", style: "aggressive" },
      ],
      claim: "À acheter quatre cents tracteurs neufs. C'est dans le prospectus, et les camions sont dans nos dépôts.",
      contradictedBy: null,
      rebuttal: "Je viens de vous le dire, maître : les factures des tracteurs sont au dossier.",
      finding: "",
      pressure: 0,
    },
    {
      id: "t-stocks",
      title: "Les stocks de Newark",
      questions: [
        { id: "q-stk-1", label: "« Les pièces de rechange ajoutées en décembre sont-elles physiquement en entrepôt ? »", style: "precise" },
        { id: "q-stk-2", label: "« Comment gérez-vous vos stocks ? »", style: "open" },
        { id: "q-stk-3", label: "« Vos stocks sont du vent, n'est-ce pas ? »", style: "aggressive" },
      ],
      claim: "Évidemment. Tout est à Newark, rangé et inventorié. Nous avons anticipé la hausse d'activité.",
      contradictedBy: "p-warehouse",
      rebuttal: "Aucune entrée… C'est peut-être une erreur de saisie de l'entrepôt. Je… je vérifierai.",
      finding: "Stocks fictifs",
      pressure: 18,
    },
  ],
  pieces: [
    { id: "p-contract", title: "Contrat Halvorsen", detail: "Signé à Oslo le 3 janvier" },
    { id: "p-orca", title: "Orca Partners LLC", detail: "Gérante : Linda Rourke" },
    { id: "p-maintenance", title: "Rapport de maintenance", detail: "Camions réformés à 5,2 ans" },
    { id: "p-warehouse", title: "Registre de Newark", detail: "Aucune entrée en décembre" },
    { id: "p-bond", title: "Prospectus obligataire", detail: "400 tracteurs, 5,25 %" },
    { id: "p-auditor", title: "Lettre du commissaire aux comptes", detail: "« Sans réserve » (N-1)" },
  ],
};
