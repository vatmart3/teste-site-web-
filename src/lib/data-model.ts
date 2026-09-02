/**
 * Modèle de données de la phase 2. Rien ici n'est branché en phase 1 : c'est la
 * forme que prendront les tables le jour où les comptes, les partages, les
 * rappels et Stripe arrivent. Il est écrit maintenant pour que la phase 1 n'ait
 * pas à être défaite ensuite.
 *
 * Règle qui ne bougera pas : aucune table ne contient de fichier source. On ne
 * stocke que du résultat structuré, et seulement pour un utilisateur identifié.
 */

export type Plan = "free" | "pro";

export type User = {
  id: string;
  email: string;
  createdAt: string;
  plan: Plan;
  /** Identifiants Stripe, nuls tant que l'utilisateur est en gratuit. */
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planRenewsAt: string | null;
};

export type DailyUsage = {
  userId: string | null;
  ipHash: string;
  day: string;
  conversions: number;
};

export type StoredConversion = {
  id: string;
  userId: string;
  /** SHA-256 du lot de pages : sert de clé de cache et de déduplication. */
  batchHash: string;
  subject: string;
  title: string;
  language: string;
  /** Le JSON validé. Les images d'origine ne sont jamais écrites. */
  payload: string;
  pageCount: number;
  examDate: string | null;
  createdAt: string;
};

export type CardProgress = {
  conversionId: string;
  cardId: string;
  /** Su / à revoir / pas du tout, tels que l'étudiant les note en révision. */
  state: "known" | "shaky" | "unknown";
  reviewedAt: string;
  reviewCount: number;
};

/** Courbe de l'oubli : J+1, J+3, J+7 après la première révision. */
export const REVIEW_OFFSETS_DAYS = [1, 3, 7] as const;

export type ReviewReminder = {
  conversionId: string;
  userId: string;
  dueAt: string;
  offsetDays: (typeof REVIEW_OFFSETS_DAYS)[number];
  sentAt: string | null;
};

export type ShareLink = {
  token: string;
  conversionId: string;
  createdAt: string;
  views: number;
  revokedAt: string | null;
};

export type ConversionCounter = {
  day: string;
  total: number;
};
