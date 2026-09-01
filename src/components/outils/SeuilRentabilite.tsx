import { useState } from 'react'
import {
  datePointMort,
  formatDecimal,
  formatEuro,
  formatPourcent,
  seuilRentabilite,
} from '../../lib/compta'
import { Section, Valeur } from '../ui/primitives'

export function SeuilRentabilite() {
  const [ca, setCa] = useState('500000')
  const [cv, setCv] = useState('300000')
  const [cf, setCf] = useState('120000')
  const [pu, setPu] = useState('50')

  const n = (v: string) => Number(v.replace(/\s/g, '').replace(',', '.')) || 0
  const r = seuilRentabilite(n(ca), n(cv), n(cf), n(pu) || undefined)
  const annee = new Date().getFullYear()

  return (
    <Section folio="SR" titre="Seuil de rentabilité">
      <div className="grid lg:grid-cols-[minmax(0,22rem)_1fr] gap-10">
        <div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 mb-5">
            <label className="block">
              <span className="etiquette">Chiffre d'affaires</span>
              <input inputMode="decimal" value={ca} onChange={(e) => setCa(e.target.value)} className="champ champ-chiffre chiffre" />
            </label>
            <label className="block">
              <span className="etiquette">Charges variables</span>
              <input inputMode="decimal" value={cv} onChange={(e) => setCv(e.target.value)} className="champ champ-chiffre chiffre" />
            </label>
            <label className="block">
              <span className="etiquette">Charges fixes</span>
              <input inputMode="decimal" value={cf} onChange={(e) => setCf(e.target.value)} className="champ champ-chiffre chiffre" />
            </label>
            <label className="block">
              <span className="etiquette">Prix de vente unitaire</span>
              <input inputMode="decimal" value={pu} onChange={(e) => setPu(e.target.value)} className="champ champ-chiffre chiffre" />
            </label>
          </div>

          <Valeur libelle="Marge sur coût variable" valeur={formatEuro(r.margeCoutVariable)} unite="€" ton="credit" />
          <Valeur libelle="Taux de MCV" valeur={formatPourcent(r.tauxMcv)} />
          <Valeur libelle="Seuil de rentabilité" valeur={formatEuro(r.seuilEuros)} unite="€" ton="or" />
          <Valeur
            libelle="Seuil en quantités"
            valeur={r.seuilQuantites !== null ? r.seuilQuantites.toLocaleString('fr-FR') : '—'}
            unite="u."
          />
          <Valeur libelle="Point mort (base 360 j)" valeur={datePointMort(r.pointMortJours, annee)} />
          <Valeur libelle="Marge de sécurité" valeur={formatEuro(r.margeSecurite)} unite="€" />
          <Valeur libelle="Indice de sécurité" valeur={formatPourcent(r.indiceSecurite)} />
          <Valeur
            libelle="Levier opérationnel"
            valeur={formatDecimal(r.levierOperationnel)}
          />
          <Valeur
            libelle="Résultat"
            valeur={formatEuro(r.resultat)}
            unite="€"
            ton={r.resultat >= 0 ? 'credit' : 'debit'}
          />
        </div>

        <GraphiquePointMort
          ca={r.chiffreAffaires}
          tauxMcv={r.tauxMcv / 100}
          chargesFixes={r.chargesFixes}
          seuil={r.seuilEuros}
        />
      </div>
    </Section>
  )
}

function GraphiquePointMort({
  ca,
  tauxMcv,
  chargesFixes,
  seuil,
}: {
  ca: number
  tauxMcv: number
  chargesFixes: number
  seuil: number
}) {
  const L = 640
  const H = 380
  const marge = { g: 68, d: 18, h: 18, b: 42 }
  const xMax = Math.max(ca * 1.25, seuil * 1.25, 1)
  const yMax = Math.max(chargesFixes * 1.6, xMax * tauxMcv * 1.1, 1)

  const px = (v: number) => marge.g + (v / xMax) * (L - marge.g - marge.d)
  const py = (v: number) => H - marge.b - (v / yMax) * (H - marge.h - marge.b)

  const graduationsX = Array.from({ length: 5 }, (_, i) => (xMax / 4) * i)
  const graduationsY = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i)

  const abrege = (v: number) =>
    v >= 1000 ? `${Math.round(v / 1000).toLocaleString('fr-FR')} k` : Math.round(v).toString()

  const valide = Number.isFinite(seuil) && tauxMcv > 0

  return (
    <figure className="min-w-0">
      <svg
        viewBox={`0 0 ${L} ${H}`}
        className="w-full h-auto filet border bg-papier-vif"
        role="img"
        aria-label={`Graphique du point mort : la marge sur coût variable croise les charges fixes à ${formatEuro(seuil)} euros de chiffre d'affaires.`}
      >
        {graduationsY.map((v, i) => (
          <g key={`y${i}`}>
            <line x1={marge.g} y1={py(v)} x2={L - marge.d} y2={py(v)} stroke="var(--color-filet)" strokeWidth={i === 0 ? 1.4 : 0.7} />
            <text x={marge.g - 8} y={py(v) + 4} textAnchor="end" fontSize="10" fontFamily="var(--font-chiffre)" fill="var(--color-encre-clair)">
              {abrege(v)}
            </text>
          </g>
        ))}
        {graduationsX.map((v, i) => (
          <g key={`x${i}`}>
            <line x1={px(v)} y1={H - marge.b} x2={px(v)} y2={H - marge.b + 4} stroke="var(--color-filet-fort)" />
            <text x={px(v)} y={H - marge.b + 17} textAnchor="middle" fontSize="10" fontFamily="var(--font-chiffre)" fill="var(--color-encre-clair)">
              {abrege(v)}
            </text>
          </g>
        ))}

        {/* Zone de perte / zone de profit */}
        {valide ? (
          <>
            <rect x={marge.g} y={marge.h} width={Math.max(0, px(seuil) - marge.g)} height={H - marge.h - marge.b} fill="var(--color-debit)" opacity="0.05" />
            <rect x={px(seuil)} y={marge.h} width={Math.max(0, L - marge.d - px(seuil))} height={H - marge.h - marge.b} fill="var(--color-credit)" opacity="0.06" />
          </>
        ) : null}

        {/* Charges fixes : droite horizontale */}
        <line x1={marge.g} y1={py(chargesFixes)} x2={L - marge.d} y2={py(chargesFixes)} stroke="var(--color-debit)" strokeWidth="2" />
        <text x={L - marge.d - 4} y={py(chargesFixes) - 6} textAnchor="end" fontSize="11" fontFamily="var(--font-interface)" fill="var(--color-debit)" fontWeight="600">
          Charges fixes
        </text>

        {/* Marge sur coût variable : droite passant par l'origine */}
        <line x1={px(0)} y1={py(0)} x2={px(xMax)} y2={py(xMax * tauxMcv)} stroke="var(--color-credit)" strokeWidth="2" />
        <text x={px(xMax) - 6} y={py(xMax * tauxMcv) - 8} textAnchor="end" fontSize="11" fontFamily="var(--font-interface)" fill="var(--color-credit)" fontWeight="600">
          Marge sur coût variable
        </text>

        {/* Seuil */}
        {valide ? (
          <>
            <line x1={px(seuil)} y1={H - marge.b} x2={px(seuil)} y2={py(chargesFixes)} stroke="var(--color-or)" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx={px(seuil)} cy={py(chargesFixes)} r="4.5" fill="var(--color-or)" />
            <text x={px(seuil) + 8} y={py(chargesFixes) - 10} fontSize="11" fontFamily="var(--font-chiffre)" fill="var(--color-encre)" fontWeight="600">
              SR {abrege(seuil)} €
            </text>
          </>
        ) : null}

        {/* CA réalisé */}
        {ca > 0 ? (
          <line x1={px(ca)} y1={marge.h} x2={px(ca)} y2={H - marge.b} stroke="var(--color-encre)" strokeWidth="1" strokeDasharray="2 4" />
        ) : null}

        <line x1={marge.g} y1={marge.h} x2={marge.g} y2={H - marge.b} stroke="var(--color-filet-fort)" strokeWidth="1.4" />
        <text x={marge.g} y={H - 6} fontSize="10" fontFamily="var(--font-interface)" fill="var(--color-encre-clair)">
          Chiffre d'affaires (€)
        </text>
      </svg>
      <figcaption className="folio mt-2">
        La zone rouge est la zone de perte, la zone verte celle du profit. Le trait pointillé sombre
        marque le chiffre d'affaires réalisé.
      </figcaption>
    </figure>
  )
}
