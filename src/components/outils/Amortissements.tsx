import { useMemo, useState } from 'react'
import {
  coefficientDegressif,
  formatDecimal,
  formatEuro,
  planAmortissement,
  type ModeAmortissement,
} from '../../lib/compta'
import { formatDateCourte, isoAujourdhui } from '../../lib/temps'
import { messageTelechargement, telecharger } from '../../lib/telechargement'
import { Section } from '../ui/primitives'

export function Amortissements() {
  const [valeurOrigine, setValeurOrigine] = useState('30000')
  const [acquisition, setAcquisition] = useState(`${new Date().getFullYear()}-04-15`)
  const [miseEnService, setMiseEnService] = useState(`${new Date().getFullYear()}-04-15`)
  const [duree, setDuree] = useState('5')
  const [mode, setMode] = useState<ModeAmortissement>('lineaire')
  const [cloture, setCloture] = useState(`${new Date().getFullYear()}-12-31`)
  const [residuelle, setResiduelle] = useState('0')
  const [etatExport, setEtatExport] = useState('')

  const parametres = {
    valeurOrigine: Number(valeurOrigine.replace(',', '.')) || 0,
    acquisition,
    miseEnService,
    dureeAnnees: Number(duree.replace(',', '.')) || 0,
    mode,
    clotureExercice: cloture,
    valeurResiduelle: Number(residuelle.replace(',', '.')) || 0,
  }

  const plan = useMemo(() => planAmortissement(parametres), [
    parametres.valeurOrigine,
    parametres.acquisition,
    parametres.miseEnService,
    parametres.dureeAnnees,
    parametres.mode,
    parametres.clotureExercice,
    parametres.valeurResiduelle,
  ])

  const coef = coefficientDegressif(parametres.dureeAnnees)
  const tauxLineaire = parametres.dureeAnnees ? 100 / parametres.dureeAnnees : 0

  const exporterCsv = async () => {
    const entetes = ['Exercice', 'Debut', 'Fin', 'Base', 'Taux', 'Jours', 'Annuite', 'Cumul', 'VNC']
    const lignes = plan.map((l) =>
      [l.exercice, l.debut, l.fin, l.base, l.taux, l.jours, l.annuite, l.cumul, l.vnc].join(';'),
    )
    // `sep=;` fait ouvrir le fichier en colonnes par Excel en configuration française.
    const csv = ['sep=;', entetes.join(';'), ...lignes].join('\n')
    const nom = `plan-amortissement-${mode}-${isoAujourdhui()}.csv`
    const r = await telecharger(nom, `\ufeff${csv}`, 'text/csv;charset=utf-8')
    setEtatExport(messageTelechargement(r, nom))
  }

  return (
    <Section
      folio="AMT"
      titre="Plan d'amortissement"
      aside={
        mode === 'degressif' ? (
          <span className="chiffre">
            coefficient {formatDecimal(coef, 2)} · taux {formatDecimal(tauxLineaire * coef)} %
          </span>
        ) : (
          <span className="chiffre">taux {formatDecimal(tauxLineaire)} %</span>
        )
      }
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3 mb-5 filet-b pb-4">
        <label className="block">
          <span className="etiquette">Valeur d'origine (HT)</span>
          <input inputMode="decimal" value={valeurOrigine} onChange={(e) => setValeurOrigine(e.target.value)} className="champ champ-chiffre chiffre" />
        </label>
        <label className="block">
          <span className="etiquette">Durée d'usage (années)</span>
          <input inputMode="decimal" value={duree} onChange={(e) => setDuree(e.target.value)} className="champ champ-chiffre chiffre" />
        </label>
        <label className="block">
          <span className="etiquette">Date d'acquisition</span>
          <input type="date" value={acquisition} onChange={(e) => setAcquisition(e.target.value)} className="champ" />
        </label>
        <label className="block">
          <span className="etiquette">Mise en service</span>
          <input type="date" value={miseEnService} onChange={(e) => setMiseEnService(e.target.value)} className="champ" />
        </label>
        <label className="block">
          <span className="etiquette">Clôture de l'exercice</span>
          <input type="date" value={cloture} onChange={(e) => setCloture(e.target.value)} className="champ" />
        </label>
        <label className="block">
          <span className="etiquette">Valeur résiduelle</span>
          <input inputMode="decimal" value={residuelle} onChange={(e) => setResiduelle(e.target.value)} className="champ champ-chiffre chiffre" />
        </label>
        <div className="sm:col-span-2 flex items-end">
          <div className="filet border flex">
            {(['lineaire', 'degressif'] as ModeAmortissement[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`onglet ${mode === m ? 'bg-encre text-papier-vif' : ''}`}
              >
                {m === 'lineaire' ? 'Linéaire' : 'Dégressif'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-folio text-encre-clair mb-3">
        {mode === 'lineaire'
          ? 'Prorata temporis au jour près à partir de la mise en service, en base commerciale 30/360.'
          : 'Prorata en mois entiers depuis le 1er du mois d’acquisition. Bascule automatique en linéaire dès que le taux linéaire résiduel dépasse le taux dégressif.'}
      </p>

      {plan.length ? (
        <>
          <div className="overflow-x-auto">
            <table className="listing w-full min-w-[42rem]">
              <thead>
                <tr>
                  <th>Exercice</th>
                  <th>Période</th>
                  <th className="text-right">Base</th>
                  <th className="text-right">Taux</th>
                  <th className="text-right">Jours</th>
                  <th className="text-right">Annuité</th>
                  <th className="text-right">Cumul</th>
                  <th className="text-right">VNC</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((l) => (
                  <tr key={`${l.exercice}-${l.debut}`}>
                    <td className="chiffre font-semibold">{l.exercice}</td>
                    <td className="chiffre text-folio">
                      {formatDateCourte(l.debut)} → {formatDateCourte(l.fin)}
                    </td>
                    <td className="num">{formatEuro(l.base)}</td>
                    <td className="num">{formatDecimal(l.taux)} %</td>
                    <td className="num text-folio">{l.jours}</td>
                    <td className="num font-semibold">{formatEuro(l.annuite)}</td>
                    <td className="num">{formatEuro(l.cumul)}</td>
                    <td className="num">{formatEuro(l.vnc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <button type="button" onClick={() => void exporterCsv()} className="bouton">
              Exporter en CSV
            </button>
            <p className="folio" aria-live="polite">
              {etatExport}
            </p>
            <p className="text-folio text-encre-clair">
              Écriture d'inventaire : <span className="chiffre">6811</span> au débit,{' '}
              <span className="chiffre">28…</span> au crédit, pour{' '}
              <span className="chiffre">{formatEuro(plan[0].annuite)}</span> sur le premier exercice.
            </p>
          </div>
        </>
      ) : (
        <p className="italic text-encre-clair py-4">
          Renseigne une valeur d'origine et une durée pour générer le plan.
        </p>
      )}
    </Section>
  )
}
