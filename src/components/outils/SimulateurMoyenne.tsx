import { useMemo } from 'react'
import { useRegistre, MATIERES_REGISTRE } from '../../store/useRegistre'
import { AVERTISSEMENT_COEFFICIENTS } from '../../data/epreuves'
import { mention, moyennePonderee, moyenneSimulee } from '../../lib/moyennes'
import { formatDecimal } from '../../lib/compta'
import { Section } from '../ui/primitives'

export function SimulateurMoyenne() {
  const epreuves = useRegistre((s) => s.epreuves)
  const notes = useRegistre((s) => s.notes)
  const modifier = useRegistre((s) => s.modifierEpreuve)
  const ajouter = useRegistre((s) => s.ajouterEpreuve)
  const supprimer = useRegistre((s) => s.supprimerEpreuve)
  const reinitialiser = useRegistre((s) => s.reinitialiserEpreuves)

  const moyenne = moyenneSimulee(epreuves)
  const total = epreuves.reduce((s, e) => s + (e.coefficient || 0), 0)
  const m = mention(moyenne.valeur)

  /** Moyenne réelle de tes contrôles, matière par matière, pour chaque épreuve. */
  const reelles = useMemo(() => {
    const parCode: Record<string, number | null> = {}
    for (const mat of MATIERES_REGISTRE.matieres) {
      parCode[mat.code] = moyennePonderee(notes.filter((n) => n.code === mat.code)).valeur
    }
    return Object.fromEntries(
      epreuves.map((e) => {
        const dispo = e.codesMatiere.map((c) => parCode[c]).filter((v): v is number => v !== null)
        return [e.id, dispo.length ? Math.round((dispo.reduce((a, b) => a + b, 0) / dispo.length) * 100) / 100 : null]
      }),
    )
  }, [epreuves, notes])

  return (
    <Section
      folio="BTS"
      titre="Simulateur de moyenne"
      aside={<span className="chiffre">total des coefficients : {total}</span>}
    >
      <p className="filet border-l-4 border-l-[var(--color-or)] pl-3 py-2 mb-5 text-menu bg-[color-mix(in_srgb,var(--color-or)_9%,transparent)]">
        {AVERTISSEMENT_COEFFICIENTS}
      </p>

      <div className="overflow-x-auto">
        <table className="listing w-full min-w-[46rem]">
          <thead>
            <tr>
              <th className="w-[4.5rem]">Code</th>
              <th>Épreuve</th>
              <th className="w-[11rem]">Forme</th>
              <th className="w-[5.5rem] text-right">Coef.</th>
              <th className="w-[6.5rem] text-right">Note visée</th>
              <th className="w-[7rem] text-right">Tes notes</th>
              <th className="w-[6rem] text-right">Points</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {epreuves.map((e) => (
              <tr key={e.id}>
                <td>
                  <input
                    value={e.code}
                    onChange={(ev) => modifier(e.id, { code: ev.target.value })}
                    className="champ chiffre font-semibold"
                    aria-label="Code de l'épreuve"
                  />
                </td>
                <td>
                  <input
                    value={e.intitule}
                    onChange={(ev) => modifier(e.id, { intitule: ev.target.value })}
                    className="champ"
                    aria-label="Intitulé de l'épreuve"
                  />
                </td>
                <td className="text-folio text-encre-clair">{e.forme}</td>
                <td>
                  <input
                    inputMode="decimal"
                    value={e.coefficient}
                    onChange={(ev) => modifier(e.id, { coefficient: Number(ev.target.value.replace(',', '.')) || 0 })}
                    className="champ champ-chiffre chiffre"
                    aria-label="Coefficient"
                  />
                </td>
                <td>
                  <input
                    inputMode="decimal"
                    placeholder="—"
                    value={e.note ?? ''}
                    onChange={(ev) =>
                      modifier(e.id, {
                        note: ev.target.value === '' ? null : Number(ev.target.value.replace(',', '.')),
                      })
                    }
                    className="champ champ-chiffre chiffre"
                    aria-label="Note visée sur 20"
                  />
                </td>
                <td className="num text-folio">
                  {reelles[e.id] !== null && reelles[e.id] !== undefined ? (
                    <button
                      type="button"
                      onClick={() => modifier(e.id, { note: reelles[e.id] as number })}
                      className="lien-souligne chiffre"
                      title="Reprendre cette moyenne comme note visée"
                    >
                      {formatDecimal(reelles[e.id] as number)}
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="num">
                  {e.note !== null ? formatDecimal(e.note * e.coefficient, 1) : '—'}
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => supprimer(e.id)}
                    className="folio lien-souligne hover:text-debit"
                    aria-label={`Supprimer l'épreuve ${e.code}`}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="filet-double-b">
              <td colSpan={3} className="pt-2 font-bold">Moyenne pondérée</td>
              <td className="num pt-2 font-bold">{total}</td>
              <td className="num pt-2 text-[1.3rem] font-bold" colSpan={2}>
                {moyenne.valeur !== null ? formatDecimal(moyenne.valeur) : '—'}
                <span className="text-folio">/20</span>
              </td>
              <td className="num pt-2 font-bold">
                {formatDecimal(epreuves.reduce((s, e) => s + (e.note ?? 0) * e.coefficient, 0), 1)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4">
        <button type="button" onClick={ajouter} className="bouton bouton-discret">
          Ajouter une épreuve
        </button>
        <button type="button" onClick={reinitialiser} className="bouton bouton-discret">
          Revenir aux coefficients par défaut
        </button>
        {m ? (
          <p
            className={`chiffre text-menu font-semibold px-3 py-1.5 border ${
              moyenne.valeur !== null && moyenne.valeur >= 10 ? 'balance-equilibree' : 'balance-desequilibree'
            }`}
            aria-live="polite"
          >
            {m}
            {moyenne.valeur !== null && moyenne.valeur < 10
              ? ` — il te manque ${formatDecimal((10 - moyenne.valeur) * moyenne.totalCoefficients, 1)} points`
              : ''}
          </p>
        ) : null}
      </div>
    </Section>
  )
}
