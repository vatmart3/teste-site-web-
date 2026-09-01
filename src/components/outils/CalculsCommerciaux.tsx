import { useState } from 'react'
import {
  cascadeReductions,
  formatDecimal,
  formatEuro,
  formatPourcent,
  marges,
  type Reduction,
} from '../../lib/compta'
import { Section, Valeur } from '../ui/primitives'

export function CalculsCommerciaux() {
  const [brut, setBrut] = useState('10000')
  const [escompte, setEscompte] = useState('2')
  const [reductions, setReductions] = useState<Reduction[]>([
    { id: 'r1', type: 'remise', taux: 10 },
    { id: 'r2', type: 'remise', taux: 5 },
  ])

  const [prixVente, setPrixVente] = useState('150')
  const [coutAchat, setCoutAchat] = useState('100')
  const [tauxTva, setTauxTva] = useState('20')

  const n = (v: string) => Number(v.replace(',', '.')) || 0
  const cascade = cascadeReductions(n(brut), reductions, n(escompte))
  const m = marges(n(prixVente), n(coutAchat), n(tauxTva))

  return (
    <div className="grid lg:grid-cols-2 gap-10">
      <Section folio="RED" titre="Réductions en cascade et escompte">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <label className="block w-40">
            <span className="etiquette">Montant brut HT</span>
            <input inputMode="decimal" value={brut} onChange={(e) => setBrut(e.target.value)} className="champ champ-chiffre chiffre" />
          </label>
          <label className="block w-32">
            <span className="etiquette">Escompte (%)</span>
            <input inputMode="decimal" value={escompte} onChange={(e) => setEscompte(e.target.value)} className="champ champ-chiffre chiffre" />
          </label>
        </div>

        <table className="listing w-full mb-3">
          <thead>
            <tr>
              <th>Étape</th>
              <th className="w-[6rem]">Type</th>
              <th className="w-[5rem] text-right">Taux</th>
              <th className="text-right">Montant</th>
              <th className="text-right">Net</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="font-semibold">Brut</td>
              <td className="num font-semibold">{formatEuro(cascade.brut)}</td>
              <td />
            </tr>
            {reductions.map((r, i) => (
              <tr key={r.id}>
                <td className="chiffre text-folio">{i + 1}</td>
                <td>
                  <select
                    value={r.type}
                    onChange={(e) =>
                      setReductions((rs) =>
                        rs.map((x) => (x.id === r.id ? { ...x, type: e.target.value as Reduction['type'] } : x)),
                      )
                    }
                    className="champ text-menu"
                    aria-label="Type de réduction"
                  >
                    <option value="remise">Remise</option>
                    <option value="rabais">Rabais</option>
                    <option value="ristourne">Ristourne</option>
                  </select>
                </td>
                <td>
                  <input
                    inputMode="decimal"
                    value={r.taux}
                    onChange={(e) =>
                      setReductions((rs) =>
                        rs.map((x) => (x.id === r.id ? { ...x, taux: Number(e.target.value.replace(',', '.')) || 0 } : x)),
                      )
                    }
                    className="champ champ-chiffre chiffre"
                    aria-label="Taux de réduction"
                  />
                </td>
                <td className="num sens-debit">− {formatEuro(cascade.etapes[i]?.montant ?? 0)}</td>
                <td className="num">{formatEuro(cascade.etapes[i]?.reste ?? 0)}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => setReductions((rs) => rs.filter((x) => x.id !== r.id))}
                    className="folio lien-souligne hover:text-debit"
                    aria-label="Retirer cette réduction"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={() =>
            setReductions((rs) => [
              ...rs,
              { id: Math.random().toString(36).slice(2, 8), type: 'remise', taux: 5 },
            ])
          }
          className="bouton bouton-discret mb-4"
        >
          Ajouter une réduction
        </button>

        <Valeur libelle="Net commercial" valeur={formatEuro(cascade.netCommercial)} unite="€" />
        <Valeur libelle={`Escompte ${escompte} %`} valeur={`− ${formatEuro(cascade.escompteMontant)}`} unite="€" ton="debit" />
        <Valeur libelle="Net financier" valeur={formatEuro(cascade.netFinancier)} unite="€" ton="credit" />
        <p className="text-folio text-encre-clair mt-3">
          L'escompte de règlement se comptabilise en <span className="chiffre">665</span> chez le
          vendeur et en <span className="chiffre">765</span> chez l'acheteur. Les remises, rabais et
          ristournes déduits sur la facture ne se comptabilisent pas séparément.
        </p>
      </Section>

      <Section folio="MRG" titre="Marge, taux de marge et de marque">
        <div className="grid grid-cols-3 gap-4 mb-5">
          <label className="block">
            <span className="etiquette">Prix de vente HT</span>
            <input inputMode="decimal" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} className="champ champ-chiffre chiffre" />
          </label>
          <label className="block">
            <span className="etiquette">Coût d'achat HT</span>
            <input inputMode="decimal" value={coutAchat} onChange={(e) => setCoutAchat(e.target.value)} className="champ champ-chiffre chiffre" />
          </label>
          <label className="block">
            <span className="etiquette">TVA (%)</span>
            <input inputMode="decimal" value={tauxTva} onChange={(e) => setTauxTva(e.target.value)} className="champ champ-chiffre chiffre" />
          </label>
        </div>

        <Valeur libelle="Marge commerciale" valeur={formatEuro(m.margeCommerciale)} unite="€" ton="credit" />
        <Valeur libelle="Taux de marge (marge / coût d'achat)" valeur={formatPourcent(m.tauxDeMarge)} />
        <Valeur libelle="Taux de marque (marge / prix de vente)" valeur={formatPourcent(m.tauxDeMarque)} />
        <Valeur
          libelle="Coefficient multiplicateur (coût HT → prix TTC)"
          valeur={formatDecimal(m.coefficientMultiplicateur, 4)}
          ton="or"
        />
        <p className="text-folio text-encre-clair mt-3">
          Piège classique : le taux de marge se calcule sur le coût d'achat, le taux de marque sur le
          prix de vente. Ils ne sont jamais égaux.
        </p>
      </Section>
    </div>
  )
}
