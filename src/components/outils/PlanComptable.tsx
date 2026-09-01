import { useMemo, useState } from 'react'
import { CLASSES, chercherComptes } from '../../data/pcg'
import { useCopie } from '../../lib/hooks'
import { Section } from '../ui/primitives'

export function PlanComptable() {
  const [requete, setRequete] = useState('')
  const [classe, setClasse] = useState<number | null>(null)
  const [copie, copier] = useCopie()

  const resultats = useMemo(() => chercherComptes(requete, classe), [requete, classe])

  return (
    <Section
      folio="PCG"
      titre="Plan comptable général"
      aside={
        <span className="chiffre">
          {resultats.length} compte{resultats.length > 1 ? 's' : ''}
        </span>
      }
    >
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 mb-4">
        <div className="flex-1 min-w-[15rem]">
          <label className="etiquette" htmlFor="pcg-recherche">
            Recherche par numéro ou par intitulé
          </label>
          <input
            id="pcg-recherche"
            type="search"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="401, tva déductible, dotation…"
            className="champ chiffre"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap items-stretch filet border">
          <button
            type="button"
            onClick={() => setClasse(null)}
            aria-pressed={classe === null}
            className={`onglet ${classe === null ? 'bg-encre text-papier-vif' : ''}`}
          >
            Toutes
          </button>
          {CLASSES.map((c) => (
            <button
              key={c.numero}
              type="button"
              onClick={() => setClasse(classe === c.numero ? null : c.numero)}
              aria-pressed={classe === c.numero}
              title={c.libelle}
              className={`onglet chiffre ${classe === c.numero ? 'bg-encre text-papier-vif' : ''}`}
            >
              {c.numero}
            </button>
          ))}
        </div>
      </div>

      <p className="folio mb-2" aria-live="polite">
        {copie ? `Numéro ${copie} copié.` : 'Clique sur une ligne pour copier le numéro de compte.'}
      </p>

      <div className="max-h-[62vh] overflow-y-auto filet border">
        <table className="listing w-full text-menu">
          <thead className="sticky top-0 bg-papier-vif z-10">
            <tr>
              <th className="w-[7.5rem]">Numéro</th>
              <th>Intitulé</th>
              <th className="w-[4rem] text-right">Classe</th>
            </tr>
          </thead>
          <tbody>
            {resultats.map((c) => (
              <tr
                key={c.numero}
                onClick={() => copier(c.numero)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    copier(c.numero)
                  }
                }}
                className="cursor-pointer hover:bg-[color-mix(in_srgb,var(--color-or)_20%,transparent)]"
              >
                <td className="chiffre font-semibold">{c.numero}</td>
                <td>{c.intitule}</td>
                <td className="num text-folio">{c.classe}</td>
              </tr>
            ))}
            {!resultats.length ? (
              <tr>
                <td colSpan={3} className="italic text-encre-clair py-4">
                  Aucun compte ne correspond. Essaie un numéro (44566) ou un mot (escompte).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
