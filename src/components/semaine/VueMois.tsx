import { useMemo } from 'react'
import type { Creneau, Devoir, Jour, Matiere } from '../../types'
import { JOURS, enMinutes, isoAujourdhui, memeJour } from '../../lib/temps'
import { creneauActif } from '../../lib/selection'

const NOMS_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

/** Grille du mois : une pastille par matière du jour, la couleur fait le reste. */
export function VueMois({
  mois,
  creneaux,
  matieres,
  devoirs,
  maintenant,
  semestre,
  quinzaine,
  onOuvrir,
}: {
  mois: Date
  creneaux: Creneau[]
  matieres: Matiere[]
  devoirs: Devoir[]
  maintenant: Date
  semestre: 1 | 2
  quinzaine: 'Q1' | 'Q2'
  onOuvrir: (c: Creneau) => void
}) {
  const parCode = useMemo(() => Object.fromEntries(matieres.map((m) => [m.code, m])), [matieres])

  const actifs = useMemo(
    () => creneaux.filter((c) => creneauActif(c, semestre, quinzaine)),
    [creneaux, semestre, quinzaine],
  )

  const parJour = useMemo(() => {
    const carte: Record<string, Creneau[]> = {}
    for (const j of JOURS) {
      carte[j] = actifs
        .filter((c) => c.jour === j)
        .sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut))
    }
    return carte
  }, [actifs])

  const echeances = useMemo(() => {
    const carte: Record<string, Devoir[]> = {}
    for (const d of devoirs) {
      if (d.fait) continue
      ;(carte[d.echeance] ??= []).push(d)
    }
    return carte
  }, [devoirs])

  // La grille commence au lundi de la semaine du 1er du mois, 6 semaines pleines.
  const premier = new Date(mois.getFullYear(), mois.getMonth(), 1)
  const debut = new Date(premier)
  debut.setDate(debut.getDate() - ((debut.getDay() + 6) % 7))

  const cases = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(debut)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-3">
        {NOMS_JOURS.map((n) => (
          <p key={n} className="folio font-semibold px-1 truncate">
            {n}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {cases.map((d, index) => {
          const jourSemaine = JOURS[(d.getDay() + 6) % 7] as Jour | undefined
          const duJour = jourSemaine ? (parJour[jourSemaine] ?? []) : []
          const iso = isoAujourdhui(d)
          const aRendre = echeances[iso] ?? []
          const aujourdhui = memeJour(d, maintenant)
          const horsMois = d.getMonth() !== mois.getMonth()
          const premierCours = duJour[0]

          return (
            <button
              key={iso}
              type="button"
              className="jour-mois entree-monter"
              style={{ ['--i' as string]: Math.floor(index / 7) }}
              data-aujourdhui={aujourdhui}
              data-echeance={aRendre.length > 0}
              data-hors-mois={horsMois}
              onClick={() => premierCours && onOuvrir(premierCours)}
              aria-label={`${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} — ${duJour.length} cours`}
            >
              <span className="chiffre text-[0.95rem] font-semibold">
                {String(d.getDate()).padStart(2, '0')}
              </span>

              {duJour.length ? (
                <span className="flex flex-wrap gap-1 mt-auto">
                  {duJour.slice(0, 6).map((c) => (
                    <span
                      key={c.id}
                      title={`${c.debut.replace(':', 'h')} ${c.matiere}`}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: parCode[c.code]?.couleur ?? '#8E9AA6',
                        display: 'inline-block',
                      }}
                    />
                  ))}
                  {duJour.length > 6 ? <span className="folio leading-none">+{duJour.length - 6}</span> : null}
                </span>
              ) : null}

              {aRendre.length ? (
                <span className="folio font-bold truncate" style={{ color: 'inherit' }}>
                  {aRendre.length} à rendre
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
