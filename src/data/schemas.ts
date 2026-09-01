/**
 * Bibliothèque de schémas d'écritures types du BTS CG.
 * Les montants sont exprimés en pourcentage d'une base saisie par l'utilisateur
 * (`part`), ou calculés à partir du taux de TVA choisi (`tva`).
 */

export type PartMontant =
  | { mode: 'base' }
  | { mode: 'tva' }
  | { mode: 'ttc' }
  | { mode: 'libre' }

export interface LigneSchema {
  sens: 'debit' | 'credit'
  compte: string
  libelle: string
  montant: PartMontant
}

export interface SchemaEcriture {
  id: string
  nom: string
  famille: 'Achats' | 'Ventes' | 'Immobilisations' | 'Paie' | 'Trésorerie' | 'Inventaire'
  commentaire: string
  lignes: LigneSchema[]
}

export const SCHEMAS: SchemaEcriture[] = [
  {
    id: 'achat-marchandises',
    nom: 'Achat de marchandises',
    famille: 'Achats',
    commentaire:
      "Facture d'achat au fournisseur. La TVA supportée est récupérable : elle se débite en 44566.",
    lignes: [
      { sens: 'debit', compte: '607', libelle: 'Achats de marchandises', montant: { mode: 'base' } },
      { sens: 'debit', compte: '44566', libelle: 'TVA déductible sur ABS', montant: { mode: 'tva' } },
      { sens: 'credit', compte: '401', libelle: 'Fournisseurs', montant: { mode: 'ttc' } },
    ],
  },
  {
    id: 'vente-marchandises',
    nom: 'Vente de marchandises',
    famille: 'Ventes',
    commentaire:
      'Facture de vente au client. La TVA facturée est due à l’État : elle se crédite en 44571.',
    lignes: [
      { sens: 'debit', compte: '411', libelle: 'Clients', montant: { mode: 'ttc' } },
      { sens: 'credit', compte: '707', libelle: 'Ventes de marchandises', montant: { mode: 'base' } },
      { sens: 'credit', compte: '44571', libelle: 'TVA collectée', montant: { mode: 'tva' } },
    ],
  },
  {
    id: 'acquisition-immobilisation',
    nom: "Acquisition d'immobilisation",
    famille: 'Immobilisations',
    commentaire:
      "La dette envers le fournisseur d'immobilisation va en 404, pas en 401. La TVA se débite en 44562.",
    lignes: [
      { sens: 'debit', compte: '2183', libelle: 'Matériel de bureau et informatique', montant: { mode: 'base' } },
      { sens: 'debit', compte: '44562', libelle: 'TVA déductible sur immobilisations', montant: { mode: 'tva' } },
      { sens: 'credit', compte: '404', libelle: "Fournisseurs d'immobilisations", montant: { mode: 'ttc' } },
    ],
  },
  {
    id: 'reglement-client',
    nom: 'Règlement client par virement',
    famille: 'Trésorerie',
    commentaire: "Aucune TVA : l'encaissement solde une créance déjà enregistrée.",
    lignes: [
      { sens: 'debit', compte: '512', libelle: 'Banque', montant: { mode: 'base' } },
      { sens: 'credit', compte: '411', libelle: 'Clients', montant: { mode: 'base' } },
    ],
  },
  {
    id: 'reglement-fournisseur',
    nom: 'Règlement fournisseur par chèque',
    famille: 'Trésorerie',
    commentaire: 'Le décaissement solde la dette fournisseur, sans TVA.',
    lignes: [
      { sens: 'debit', compte: '401', libelle: 'Fournisseurs', montant: { mode: 'base' } },
      { sens: 'credit', compte: '512', libelle: 'Banque', montant: { mode: 'base' } },
    ],
  },
  {
    id: 'effet-acceptation',
    nom: 'Effet de commerce — acceptation par le client',
    famille: 'Trésorerie',
    commentaire:
      "La créance change de nature : elle passe de 411 à 413. Chez le fournisseur, l'effet est à recevoir.",
    lignes: [
      { sens: 'debit', compte: '413', libelle: 'Clients — Effets à recevoir', montant: { mode: 'base' } },
      { sens: 'credit', compte: '411', libelle: 'Clients', montant: { mode: 'base' } },
    ],
  },
  {
    id: 'effet-escompte',
    nom: "Effet de commerce — remise à l'escompte",
    famille: 'Trésorerie',
    commentaire:
      "Le net porté en banque = nominal − agios. Les intérêts vont en 6616, la commission en 627 et sa TVA en 44566.",
    lignes: [
      { sens: 'debit', compte: '512', libelle: 'Banque — net porté en compte', montant: { mode: 'libre' } },
      { sens: 'debit', compte: '6616', libelle: "Intérêts bancaires (escompte)", montant: { mode: 'libre' } },
      { sens: 'debit', compte: '627', libelle: 'Services bancaires — commission', montant: { mode: 'libre' } },
      { sens: 'debit', compte: '44566', libelle: 'TVA déductible sur commission', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '5114', libelle: 'Effets escomptés non échus', montant: { mode: 'libre' } },
    ],
  },
  {
    id: 'paie',
    nom: 'Paie du mois',
    famille: 'Paie',
    commentaire:
      "Trois écritures à distinguer : le brut et les retenues (421/431), les charges patronales (645), puis le paiement.",
    lignes: [
      { sens: 'debit', compte: '641', libelle: 'Rémunérations du personnel (brut)', montant: { mode: 'base' } },
      { sens: 'credit', compte: '431', libelle: 'Sécurité sociale — part salariale', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '437', libelle: 'Autres organismes sociaux — part salariale', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '4421', libelle: 'Prélèvement à la source', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '421', libelle: 'Personnel — Rémunérations dues (net à payer)', montant: { mode: 'libre' } },
    ],
  },
  {
    id: 'charges-patronales',
    nom: 'Charges patronales',
    famille: 'Paie',
    commentaire: "À passer juste après l'écriture de paie, sur la même date.",
    lignes: [
      { sens: 'debit', compte: '645', libelle: 'Charges de sécurité sociale et de prévoyance', montant: { mode: 'base' } },
      { sens: 'credit', compte: '431', libelle: 'Sécurité sociale — part patronale', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '437', libelle: 'Autres organismes sociaux — part patronale', montant: { mode: 'libre' } },
    ],
  },
  {
    id: 'dotation-amortissements',
    nom: 'Dotation aux amortissements',
    famille: 'Inventaire',
    commentaire:
      "Écriture d'inventaire au 31/12. Le compte 28 reprend la racine du compte 2 amorti (2183 → 28183).",
    lignes: [
      { sens: 'debit', compte: '6811', libelle: 'Dotations aux amortissements', montant: { mode: 'base' } },
      { sens: 'credit', compte: '28183', libelle: 'Amortissements du matériel de bureau et informatique', montant: { mode: 'base' } },
    ],
  },
  {
    id: 'declaration-tva',
    nom: 'Déclaration de TVA',
    famille: 'Inventaire',
    commentaire:
      'On solde la TVA collectée par le débit, la TVA déductible par le crédit, et le solde va en 44551.',
    lignes: [
      { sens: 'debit', compte: '44571', libelle: 'TVA collectée', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '44566', libelle: 'TVA déductible sur ABS', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '44562', libelle: 'TVA déductible sur immobilisations', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '44551', libelle: 'TVA à décaisser', montant: { mode: 'libre' } },
    ],
  },
  {
    id: 'cession-immobilisation',
    nom: "Cession d'immobilisation",
    famille: 'Immobilisations',
    commentaire:
      "Trois temps : dotation complémentaire, sortie de l'actif (675/28/2…), puis produit de cession (462/775/44571).",
    lignes: [
      { sens: 'debit', compte: '462', libelle: "Créances sur cessions d'immobilisations", montant: { mode: 'ttc' } },
      { sens: 'credit', compte: '775', libelle: "Produits des cessions d'éléments d'actif", montant: { mode: 'base' } },
      { sens: 'credit', compte: '44571', libelle: 'TVA collectée', montant: { mode: 'tva' } },
    ],
  },
  {
    id: 'creance-douteuse',
    nom: 'Créance douteuse et dépréciation',
    famille: 'Inventaire',
    commentaire:
      "Le transfert 411 → 416 se fait pour le montant TTC ; la dépréciation se calcule sur le montant HT.",
    lignes: [
      { sens: 'debit', compte: '416', libelle: 'Clients douteux ou litigieux', montant: { mode: 'ttc' } },
      { sens: 'credit', compte: '411', libelle: 'Clients', montant: { mode: 'ttc' } },
      { sens: 'debit', compte: '6817', libelle: 'Dotations pour dépréciations des actifs circulants', montant: { mode: 'libre' } },
      { sens: 'credit', compte: '491', libelle: 'Dépréciations des comptes de clients', montant: { mode: 'libre' } },
    ],
  },
]
