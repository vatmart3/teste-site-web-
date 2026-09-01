import { useState } from 'react'
import { TAUX_TVA, depuisHt, depuisTtc, depuisTva, formatEuro } from '../../lib/compta'
import { Section } from '../ui/primitives'

type Depuis = 'ht' | 'ttc' | 'tva'
type Sens = 'achat' | 'vente'

const COMPTES_SENS: Record<Sens, { compte: string; intitule: string; sens: 'débit' | 'crédit' }> = {
  achat: { compte: '44566', intitule: 'TVA déductible sur autres biens et services', sens: 'débit' },
  vente: { compte: '44571', intitule: 'TVA collectée', sens: 'crédit' },
}

export function Tva() {
  const [montant, setMontant] = useState('1000')
  const [depuis, setDepuis] = useState<Depuis>('ht')
  const [taux, setTaux] = useState<number>(20)
  const [sens, setSens] = useState<Sens>('achat')

  const n = Number(montant.replace(',', '.')) || 0
  const r = depuis === 'ht' ? depuisHt(n, taux) : depuis === 'ttc' ? depuisTtc(n, taux) : depuisTva(n, taux)
  const cible = COMPTES_SENS[sens]

  return (
    <Section folio="TVA" titre="Conversion et comptabilisation de la TVA">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
        <div>
          <div className="flex flex-wrap items-end gap-4 mb-5">
            <div className="w-40">
              <label className="etiquette" htmlFor="tva-montant">
                Montant saisi
              </label>
              <input
                id="tva-montant"
                inputMode="decimal"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="champ champ-chiffre chiffre text-[1.3rem]"
              />
            </div>
            <div className="filet border flex">
              {(['ht', 'ttc', 'tva'] as Depuis[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDepuis(d)}
                  aria-pressed={depuis === d}
                  className={`onglet ${depuis === d ? 'bg-encre text-papier-vif' : ''}`}
                >
                  {d === 'ht' ? 'HT' : d === 'ttc' ? 'TTC' : 'Montant TVA'}
                </button>
              ))}
            </div>
            <div className="filet border flex">
              {TAUX_TVA.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTaux(t)}
                  aria-pressed={taux === t}
                  className={`onglet chiffre ${taux === t ? 'bg-encre text-papier-vif' : ''}`}
                >
                  {String(t).replace('.', ',')} %
                </button>
              ))}
            </div>
          </div>

          <table className="listing w-full">
            <thead>
              <tr>
                <th>Décomposition</th>
                <th className="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base hors taxes</td>
                <td className="num text-[1.05rem]">{formatEuro(r.ht)}</td>
              </tr>
              <tr>
                <td>
                  TVA à <span className="chiffre">{String(taux).replace('.', ',')} %</span>
                </td>
                <td className="num text-[1.05rem] text-or font-semibold">{formatEuro(r.tva)}</td>
              </tr>
              <tr>
                <td className="font-bold">Toutes taxes comprises</td>
                <td className="num text-[1.15rem] font-bold">{formatEuro(r.ttc)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div className="filet border flex w-max mb-4">
            {(['achat', 'vente'] as Sens[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSens(s)}
                aria-pressed={sens === s}
                className={`onglet ${sens === s ? 'bg-encre text-papier-vif' : ''}`}
              >
                {s === 'achat' ? 'Je suis à l’achat' : 'Je suis à la vente'}
              </button>
            ))}
          </div>

          <table className="listing w-full">
            <thead>
              <tr>
                <th>Compte à mouvementer</th>
                <th className="text-right sens-debit">Débit</th>
                <th className="text-right sens-credit">Crédit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="chiffre font-semibold">{cible.compte}</span> — {cible.intitule}
                </td>
                <td className="num sens-debit">{cible.sens === 'débit' ? formatEuro(r.tva) : ''}</td>
                <td className="num sens-credit">{cible.sens === 'crédit' ? formatEuro(r.tva) : ''}</td>
              </tr>
              <tr>
                <td>
                  <span className="chiffre font-semibold">{sens === 'achat' ? '607' : '707'}</span> —{' '}
                  {sens === 'achat' ? 'Achats de marchandises' : 'Ventes de marchandises'}
                </td>
                <td className="num sens-debit">{sens === 'achat' ? formatEuro(r.ht) : ''}</td>
                <td className="num sens-credit">{sens === 'vente' ? formatEuro(r.ht) : ''}</td>
              </tr>
              <tr>
                <td>
                  <span className="chiffre font-semibold">{sens === 'achat' ? '401' : '411'}</span> —{' '}
                  {sens === 'achat' ? 'Fournisseurs' : 'Clients'}
                </td>
                <td className="num sens-debit">{sens === 'vente' ? formatEuro(r.ttc) : ''}</td>
                <td className="num sens-credit">{sens === 'achat' ? formatEuro(r.ttc) : ''}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 filet border p-3">
            <p className="text-menu font-semibold mb-1">Au moment de la déclaration</p>
            <p className="text-folio text-encre-clair leading-relaxed">
              On solde <span className="chiffre">44571</span> (TVA collectée) par le débit et{' '}
              <span className="chiffre">44566</span> / <span className="chiffre">44562</span> (TVA
              déductible) par le crédit. Le solde va en <span className="chiffre">44551</span> — TVA à
              décaisser si la collectée est supérieure, sinon en <span className="chiffre">44567</span>{' '}
              — crédit de TVA à reporter.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}
