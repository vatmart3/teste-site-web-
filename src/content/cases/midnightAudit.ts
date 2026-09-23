/**
 * Affaire 1 — « L'audit de minuit ».
 * Les états financiers de Meridian Logistics (en millions de dollars) cachent quatre anomalies :
 *  1. cut-off IFRS 15 : le contrat Halvorsen est comptabilisé à la signature, avant toute prestation ;
 *  2. partie liée : Orca Partners, dirigée par un administrateur de Meridian, facture et doit de l'argent ;
 *  3. changement d'estimation : durée d'amortissement des camions portée de 5 à 9 ans, résultat gonflé ;
 *  4. stocks : +38 % pour un chiffre d'affaires à +13,7 %, pièces obsolètes non dépréciées.
 * Plusieurs lignes sont des fausses pistes (tentantes mais normales). Trois variantes de chiffres.
 */
import type { AuditCaseDef, AuditDoc, DocBlock } from "@/engine/audit/types";

interface Variant {
  halvorsen: number;
  halvorsenStart: string;
  stocks: [number, number];
  orcaFees: number;
  orcaDebt: number;
}

const VARIANTS: Variant[] = [
  { halvorsen: 84.6, halvorsenStart: "15 janvier", stocks: [412.9, 299.2], orcaFees: 38.6, orcaDebt: 41.2 },
  { halvorsen: 79.3, halvorsenStart: "12 janvier", stocks: [405.1, 290.5], orcaFees: 41.9, orcaDebt: 44.8 },
  { halvorsen: 91.2, halvorsenStart: "20 janvier", stocks: [421.7, 306.0], orcaFees: 35.2, orcaDebt: 38.5 },
];

/** Format français « 1 842,6 » ; négatif entre parenthèses. */
export function fr(v: number, digits = 1): string {
  const s = Math.abs(v)
    .toFixed(digits)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return v < 0 ? `(${s})` : s;
}

function pct(a: number, b: number): string {
  const p = ((a - b) / b) * 100;
  return `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1).replace(".", ",")} %`;
}

const LETTERHEAD: DocBlock = { kind: "letterhead", company: "MERIDIAN LOGISTICS INC.", subtitle: "Comptes consolidés de l'exercice N — en millions de dollars US" };

export function buildMidnightAudit(seed = 0): AuditCaseDef {
  const v = VARIANTS[Math.abs(seed) % VARIANTS.length]!;
  const [stN, stN1] = v.stocks;

  // ------------------------------------------------------------------ Bilan
  const fleet: [number, number] = [1842.6, 1510.4];
  const goodwill: [number, number] = [214.0, 214.0];
  const receivables: [number, number] = [688.3, 512.0];
  const cash: [number, number] = [96.1, 211.5];
  const totalN = fleet[0] + goodwill[0] + stN + receivables[0] + cash[0];
  const totalN1 = fleet[1] + goodwill[1] + stN1 + receivables[1] + cash[1];
  const debt: [number, number] = [1390.2, 1102.8];
  const suppliers: [number, number] = [542.3, 488.7];
  const provisions: [number, number] = [61.4, 58.9];
  const equityN = totalN - debt[0] - suppliers[0] - provisions[0];
  const equityN1 = totalN1 - debt[1] - suppliers[1] - provisions[1];

  const bilan: AuditDoc = {
    id: "bilan",
    title: "Bilan consolidé",
    format: "letter",
    desk: { x: -0.4, z: -0.76, rot: 0.14 },
    pages: [
      [
        LETTERHEAD,
        { kind: "title", text: "Bilan consolidé au 31 décembre" },
        { kind: "subtitle", text: "ACTIF" },
        {
          kind: "table",
          columns: ["", "31/12/N", "31/12/N-1"],
          rows: [
            { id: "bs-fleet", label: "Immobilisations corporelles (flotte)", values: [fr(fleet[0]), fr(fleet[1])] },
            { id: "bs-goodwill", label: "Écarts d'acquisition", values: [fr(goodwill[0]), fr(goodwill[1])] },
            { id: "bs-stocks", label: "Stocks de pièces et carburant", values: [fr(stN), fr(stN1)] },
            { id: "bs-receivables", label: "Créances clients", values: [fr(receivables[0]), fr(receivables[1])] },
            { id: "bs-cash", label: "Trésorerie et équivalents", values: [fr(cash[0]), fr(cash[1])] },
            { label: "Total actif", values: [fr(totalN), fr(totalN1)], bold: true },
          ],
        },
        { kind: "spacer", size: 18 },
        { kind: "subtitle", text: "PASSIF" },
        {
          kind: "table",
          columns: ["", "31/12/N", "31/12/N-1"],
          rows: [
            { label: "Capitaux propres", values: [fr(equityN), fr(equityN1)] },
            { id: "bs-debt", label: "Dettes financières", values: [fr(debt[0]), fr(debt[1])] },
            { label: "Fournisseurs", values: [fr(suppliers[0]), fr(suppliers[1])] },
            { label: "Provisions pour risques", values: [fr(provisions[0]), fr(provisions[1])] },
            { label: "Total passif", values: [fr(totalN), fr(totalN1)], bold: true },
          ],
        },
        { kind: "spacer", size: 24 },
        { kind: "para", id: "bs-debt-note", text: "La hausse des dettes financières correspond à l'emprunt obligataire émis en mars (taux fixe 5,25 %, échéance 2031) pour financer 400 tracteurs routiers." },
        { kind: "para", text: "Les notes annexes font partie intégrante des comptes consolidés.", small: true },
      ],
    ],
  };

  // ------------------------------------------------------------------ Compte de résultat
  const revenue: [number, number] = [2311.7, 2033.1];
  const purchases: [number, number] = [-1402.5, -1255.8];
  const staff: [number, number] = [-412.6, -389.2];
  const depreciation: [number, number] = [-118.4, -186.9];
  const external: [number, number] = [-117.2, -58.7];
  const opN = revenue[0] + purchases[0] + staff[0] + depreciation[0] + external[0];
  const opN1 = revenue[1] + purchases[1] + staff[1] + depreciation[1] + external[1];
  const fin: [number, number] = [-48.3, -39.1];
  const taxN = -(opN + fin[0]) * 0.24;
  const taxN1 = -(opN1 + fin[1]) * 0.24;
  const resultat: AuditDoc = {
    id: "resultat",
    title: "Compte de résultat consolidé",
    format: "letter",
    desk: { x: -0.13, z: -0.74, rot: -0.05 },
    pages: [
      [
        LETTERHEAD,
        { kind: "title", text: "Compte de résultat consolidé" },
        {
          kind: "table",
          columns: ["", "N", "N-1", "Var."],
          rows: [
            { id: "pl-revenue", label: "Chiffre d'affaires", values: [fr(revenue[0]), fr(revenue[1]), pct(revenue[0], revenue[1])] },
            { label: "Achats consommés", values: [fr(purchases[0]), fr(purchases[1]), pct(-purchases[0], -purchases[1])] },
            { id: "pl-staff", label: "Charges de personnel", values: [fr(staff[0]), fr(staff[1]), pct(-staff[0], -staff[1])] },
            { id: "pl-depreciation", label: "Dotations aux amortissements", values: [fr(depreciation[0]), fr(depreciation[1]), pct(-depreciation[0], -depreciation[1])] },
            { id: "pl-external", label: "Autres charges externes", values: [fr(external[0]), fr(external[1]), pct(-external[0], -external[1])] },
            { label: "Résultat opérationnel", values: [fr(opN), fr(opN1), pct(opN, opN1)], bold: true },
            { label: "Charges financières", values: [fr(fin[0]), fr(fin[1]), pct(-fin[0], -fin[1])] },
            { label: "Impôt sur les résultats", values: [fr(taxN), fr(taxN1), ""] },
            { label: "Résultat net", values: [fr(opN + fin[0] + taxN), fr(opN1 + fin[1] + taxN1), pct(opN + fin[0] + taxN, opN1 + fin[1] + taxN1)], bold: true },
          ],
        },
        { kind: "spacer", size: 28 },
        { kind: "para", text: "Message du directeur financier : « Un exercice record, porté par la croissance organique et une discipline de coûts exemplaire. » — D. Rourke" },
        { kind: "para", id: "pl-staff-note", text: "Les charges de personnel progressent de 6 % du fait de l'accord salarial conclu avec les chauffeurs en juin (inflation et primes de nuit)." },
      ],
    ],
  };

  // ------------------------------------------------------------------ Annexes (agrafées)
  const annexe: AuditDoc = {
    id: "annexe",
    title: "Notes annexes",
    format: "letter",
    desk: { x: 0.14, z: -0.75, rot: 0.06 },
    pages: [
      [
        LETTERHEAD,
        { kind: "title", text: "Note 2 — Principes et estimations comptables" },
        { kind: "para", text: "Les comptes consolidés sont établis selon les normes IFRS telles qu'adoptées aux États-Unis pour les émetteurs étrangers. Ils sont présentés en millions de dollars." },
        { kind: "para", id: "n2-ifrs16", text: "La norme IFRS 16 (contrats de location) est appliquée depuis l'exercice N-3, sans changement de méthode au cours de l'exercice." },
        { kind: "para", text: "Les immobilisations corporelles sont amorties linéairement sur leur durée d'utilité estimée. Les estimations sont revues à chaque clôture." },
        {
          kind: "para",
          id: "n2-useful-life",
          small: true,
          text: "À compter du 1er janvier N, la durée d'utilité des tracteurs routiers a été portée de 5 à 9 ans. Ce changement d'estimation, appliqué de manière prospective sans étude technique indépendante, réduit la dotation de l'exercice de 71,2 M$.",
        },
      ],
      [
        LETTERHEAD,
        { kind: "title", text: "Note 7 — Chiffre d'affaires" },
        { kind: "para", text: "Le chiffre d'affaires est reconnu lorsque le groupe transfère le contrôle du service au client, conformément à IFRS 15, c'est-à-dire au fur et à mesure de l'exécution des prestations de transport." },
        { kind: "para", id: "n7-segments", text: "La croissance est portée par le segment « longue distance » (+18 %) et par l'ouverture de deux plateformes logistiques dans l'Ohio." },
        {
          kind: "para",
          id: "n7-halvorsen",
          text: `Le contrat pluriannuel conclu avec Halvorsen Freight (${fr(v.halvorsen)} M$) a été comptabilisé en totalité en chiffre d'affaires au 28 décembre N, date de sa signature, et figure en créances clients.`,
        },
      ],
      [
        LETTERHEAD,
        { kind: "title", text: "Note 11 — Stocks" },
        { kind: "para", text: `Les stocks se composent de pièces détachées, de pneumatiques et de carburant. Ils s'élèvent à ${fr(stN)} M$ contre ${fr(stN1)} M$ à la clôture précédente.` },
        {
          kind: "para",
          id: "n11-no-impairment",
          small: true,
          text: "Ils incluent des pièces destinées à la gamme de camions « Series 7 », retirée du service en septembre N. Aucune dépréciation n'a été constatée, la direction estimant ces pièces revendables à leur coût.",
        },
        { kind: "spacer", size: 30 },
        { kind: "title", text: "Note 12 — Provisions" },
        { kind: "para", id: "n12-litigation", text: "Un litige prud'homal collectif (chauffeurs de l'Ohio) est provisionné à hauteur de 2,1 M$, sur la base de l'avis des conseils du groupe." },
      ],
      [
        LETTERHEAD,
        { kind: "title", text: "Note 19 — Parties liées" },
        { kind: "para", id: "n19-ceo", text: "La rémunération du directeur général a été approuvée par le comité des rémunérations et l'assemblée générale, conformément aux statuts." },
        {
          kind: "para",
          id: "n19-orca-fees",
          text: `Orca Partners LLC, dont M. Kessler est l'associé-gérant et qui siège par ailleurs au conseil d'administration de Meridian, a facturé ${fr(v.orcaFees)} M$ d'honoraires de « conseil stratégique » au cours de l'exercice.`,
        },
        {
          kind: "para",
          id: "n19-orca-debt",
          small: true,
          text: `Orca Partners est également redevable envers le groupe d'une avance de ${fr(v.orcaDebt)} M$, non rémunérée et sans garantie, consentie en novembre N.`,
        },
        { kind: "spacer", size: 30 },
        { kind: "signature", name: "Daniel Rourke", role: "Directeur financier" },
      ],
    ],
  };

  // ------------------------------------------------------------------ Bon de mission Halvorsen
  const livraison: AuditDoc = {
    id: "livraison",
    title: "Ordre de mission Halvorsen",
    format: "half",
    desk: { x: 0.4, z: -0.7, rot: -0.12 },
    pages: [
      [
        { kind: "letterhead", company: "HALVORSEN FREIGHT A/S", subtitle: "Ordre de mission — transport longue distance" },
        { kind: "para", text: "Prestataire : Meridian Logistics Inc. — Contrat-cadre signé le 28 décembre N." },
        { kind: "para", id: "bl-start", text: `Première prise en charge prévue : ${v.halvorsenStart} N+1, dépôt de Göteborg. Aucune prestation n'est due avant cette date.` },
        { kind: "para", id: "bl-weight", text: "Chargement type : 18 tonnes par ensemble routier, conteneurs 40 pieds." },
        { kind: "stamp", text: "COPIE CLIENT", color: "#1f4f8a" },
      ],
    ],
  };

  return {
    id: "midnight-audit",
    title: "L'audit de minuit",
    startMinutes: 23 * 60,
    deadlineMinutes: 32 * 60, // 8 h 00 le lendemain
    realSeconds: 11 * 60,
    hourlyRate: 180,
    docs: [bilan, resultat, annexe, livraison],
    anomalies: [
      {
        id: "cutoff",
        label: "Chiffre d'affaires reconnu trop tôt (cut-off IFRS 15)",
        short: "Cut-off !",
        weight: 30,
        lesson: "cutoff",
        explanation: "Halvorsen : tout le contrat passé en chiffre d'affaires le jour de la signature, alors que le premier camion ne roule qu'en janvier. IFRS 15 : on reconnaît le revenu quand le service est rendu.",
      },
      {
        id: "related",
        label: "Partie liée : flux avec Orca Partners",
        short: "Partie liée",
        weight: 25,
        lesson: "related-parties",
        explanation: "Orca facture des millions de « conseil » à Meridian et lui doit une avance sans garantie. Un administrateur des deux côtés : l'argent tourne en rond.",
      },
      {
        id: "depreciation",
        label: "Changement d'estimation qui gonfle le résultat (5 → 9 ans)",
        short: "5 → 9 ans ?",
        weight: 25,
        lesson: "change-estimate",
        explanation: "Allonger la durée d'amortissement de 5 à 9 ans sans étude technique, c'est fabriquer 71 millions de bénéfice d'un trait de plume. La flotte grossit, la dotation baisse : ça ne tient pas.",
      },
      {
        id: "inventory",
        label: "Stocks gonflés, pièces obsolètes non dépréciées",
        short: "Stocks +38 %",
        weight: 20,
        lesson: "inventory",
        explanation: "Des pièces pour des camions retirés du service, gardées au prix d'achat. Les stocks gonflent trois fois plus vite que l'activité.",
      },
    ],
    clues: {
      // Anomalies
      "n7-halvorsen": { anomaly: "cutoff", strength: "primary" },
      "bl-start": { anomaly: "cutoff", strength: "support" },
      "pl-revenue": { anomaly: "cutoff", strength: "support" },
      "bs-receivables": { anomaly: "cutoff", strength: "support" },
      "n19-orca-fees": { anomaly: "related", strength: "primary" },
      "n19-orca-debt": { anomaly: "related", strength: "support" },
      "pl-external": { anomaly: "related", strength: "support" },
      "n2-useful-life": { anomaly: "depreciation", strength: "primary" },
      "pl-depreciation": { anomaly: "depreciation", strength: "support" },
      "bs-fleet": { anomaly: "depreciation", strength: "support" },
      "n11-no-impairment": { anomaly: "inventory", strength: "primary" },
      "bs-stocks": { anomaly: "inventory", strength: "support" },
      // Fausses pistes
      "bs-cash": { anomaly: null, strength: "primary" },
      "bs-debt": { anomaly: null, strength: "primary" },
      "bs-debt-note": { anomaly: null, strength: "primary" },
      "bs-goodwill": { anomaly: null, strength: "primary" },
      "pl-staff": { anomaly: null, strength: "primary" },
      "pl-staff-note": { anomaly: null, strength: "primary" },
      "n2-ifrs16": { anomaly: null, strength: "primary" },
      "n7-segments": { anomaly: null, strength: "primary" },
      "n12-litigation": { anomaly: null, strength: "primary" },
      "n19-ceo": { anomaly: null, strength: "primary" },
      "bl-weight": { anomaly: null, strength: "primary" },
    },
  };
}
