import { useMemo } from 'react'
import type { Creneau, Jour, Matiere } from '../../types'
import { enMinutes, formatHeure, jourDeLaDate, lundiDeLaSemaine, memeJour, minutesDeLaDate } from '../../lib/temps'
import { creneauActif } from '../../lib/selection'

const PX_PAR_MINUTE = 1.42
const HAUT = 14

interface Pose {
  creneau: Creneau
  haut: number
  hauteur: number
  voie: number
  voies: number
}

function poser(creneaux: Creneau[], origine: number): Pose[] {
  const tries = [...creneaux].sort(
    (a, b) => enMinutes(a.debut) - enMinutes(b.debut) || enMinutes(a.fin) - enMinutes(b.fin),
  )
  const poses: Pose[] = []
  let groupe: Pose[] = []
  let finGroupe = -1

  const cloturer = () => {
    const voies = groupe.length ? Math.max(...groupe.map((p) => p.voie)) + 1 : 0
    groupe.forEach((p) => {
      p.voies = voies
    })
    groupe = []
  }

  for (const c of tries) {
    const debut = enMinutes(c.debut)
    const fin = enMinutes(c.fin)
    if (debut >= finGroupe && groupe.length) cloturer()
    const occupees = new Set(groupe.filter((p) => enMinutes(p.creneau.fin) > debut).map((p) => p.voie))
    let voie = 0
    while (occupees.has(voie)) voie += 1
    const pose: Pose = {
      creneau: c,
      haut: (debut - origine) * PX_PAR_MINUTE + HAUT,
      hauteur: (fin - debut) * PX_PAR_MINUTE,
      voie,
      voies: 1,
    }
    groupe.push(pose)
    poses.push(pose)
    finGroupe = Math.max(finGroupe, fin)
  }
  cloturer()
  return poses
}

export function Planning({
  creneaux,
  matieres,
  jours,
  bornes,
  amplitude,
  maintenant,
  semestre,
  quinzaine,
  onOuvrir,
}: {
  creneaux: Creneau[]
  matieres: Matiere[]
  jours: Jour[]
  bornes: string[]
  amplitude: { debut: string; fin: string }
  maintenant: Date
  semestre: 1 | 2
  quinzaine: 'Q1' | 'Q2'
  onOuvrir: (c: Creneau) => void
}) {
  const origine = enMinutes(amplitude.debut)
  const hauteur = (enMinutes(amplitude.fin) - origine) * PX_PAR_MINUTE + HAUT * 2

  const parCode = useMemo(() => Object.fromEntries(matieres.map((m) => [m.code, m])), [matieres])

  const actifs = useMemo(
    () => creneaux.filter((c) => creneauActif(c, semestre, quinzaine)),
    [creneaux, semestre, quinzaine],
  )

  const parJour = useMemo(
    () => jours.map((jour) => ({ jour, poses: poser(actifs.filter((c) => c.jour === jour), origine) })),
    [actifs, jours, origine],
  )

  const jourActuel = jourDeLaDate(maintenant)
  const minuteActuelle = minutesDeLaDate(maintenant)
  const lundi = lundiDeLaSemaine(maintenant)

  const dateDuJour = (jour: Jour) => {
    const d = new Date(lundi)
    d.setDate(d.getDate() + jours.indexOf(jour))
    return d
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[720px] px-3 sm:px-6">
        {/* En-tête : les jours */}
        <div className="flex items-end pb-2">
          <div className="w-[46px] sm:w-[58px] shrink-0" aria-hidden="true" />
          <div className="flex flex-1 gap-2 sm:gap-3">
            {jours.map((jour, index) => {
              const d = dateDuJour(jour)
              const estAujourdhui = memeJour(d, maintenant)
              const passe = d < maintenant && !estAujourdhui
              return (
                <div
                  key={jour}
                  className={`flex-1 min-w-0 entree-monter ${passe ? 'jour-passe' : ''}`}
                  style={{ ['--i' as string]: index }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="anton text-[clamp(0.95rem,1.7vw,1.4rem)]"
                      style={{ color: estAujourdhui ? 'var(--color-encre)' : 'var(--color-encre-clair)' }}
                    >
                      {jour.slice(0, 3)}
                    </span>
                    <span className="chiffre text-folio" style={{ color: estAujourdhui ? 'var(--color-or)' : undefined }}>
                      {String(d.getDate()).padStart(2, '0')}
                    </span>
                  </div>
                  <div
                    className="h-[2px] mt-1"
                    style={{ background: estAujourdhui ? 'var(--color-encre)' : 'var(--color-filet)' }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Corps */}
        <div className="flex" style={{ height: hauteur }}>
          <div className="w-[46px] sm:w-[58px] shrink-0 relative">
            {bornes.map((b) => {
              const y = (enMinutes(b) - origine) * PX_PAR_MINUTE + HAUT
              return (
                <div
                  key={b}
                  className="absolute right-2 -translate-y-1/2 chiffre text-folio"
                  style={{ top: y }}
                >
                  {formatHeure(enMinutes(b))}
                </div>
              )
            })}
          </div>

          <div className="relative flex-1">
            {bornes.map((b) => {
              const y = (enMinutes(b) - origine) * PX_PAR_MINUTE + HAUT
              return (
                <div
                  key={b}
                  className="absolute left-0 right-0 border-t border-[var(--color-filet)]"
                  style={{ top: y }}
                />
              )
            })}

            <div className="colonnes-jours absolute inset-0 flex gap-2 sm:gap-3" style={{ perspective: '1400px' }}>
              {parJour.map(({ jour, poses }, indexJour) => {
                const d = dateDuJour(jour)
                const estAujourdhui = memeJour(d, maintenant)
                const passe = d < maintenant && !estAujourdhui
                return (
                  <div
                    key={jour}
                    data-colonne
                    className={`relative flex-1 min-w-0 ${passe ? 'jour-passe' : ''}`}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {poses.map((p, indexBloc) => {
                      const debut = enMinutes(p.creneau.debut)
                      const fin = enMinutes(p.creneau.fin)
                      const actuel = estAujourdhui && minuteActuelle >= debut && minuteActuelle < fin
                      const m = parCode[p.creneau.code]
                      const couleur = m?.couleur ?? '#8E9AA6'
                      const largeur = 100 / p.voies
                      const grand = p.hauteur > 74
                      const moyen = p.hauteur > 46
                      return (
                        <button
                          key={p.creneau.id}
                          data-bloc
                          type="button"
                          onClick={() => onOuvrir(p.creneau)}
                          aria-current={actuel ? 'time' : undefined}
                          className={`bloc-cours entree-bloc ${actuel ? 'bloc-actuel' : ''}`}
                          style={
                            {
                              '--teinte': couleur,
                              '--i': indexJour * 3 + indexBloc,
                              top: p.haut,
                              height: Math.max(20, p.hauteur - 3),
                              left: `${p.voie * largeur}%`,
                              width: `calc(${largeur}% - 2px)`,
                            } as React.CSSProperties
                          }
                        >
                          <span
                            className={`anton block ${
                              grand ? 'text-[clamp(0.8rem,1.25vw,1.05rem)]' : 'text-[clamp(0.65rem,1vw,0.82rem)]'
                            }`}
                            style={{
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: grand ? 3 : 2,
                              overflow: 'hidden',
                              // Anton est très serré : sans cela, les accents
                              // des capitales (É, È) sont rognés en haut.
                              lineHeight: 1.06,
                              paddingTop: '0.08em',
                            }}
                          >
                            {m?.nomCourt ?? p.creneau.matiere}
                          </span>
                          {moyen ? (
                            <span className="chiffre text-[0.62rem] opacity-70 mt-auto truncate">
                              {p.creneau.debut.replace(':', 'h')} · {p.creneau.salle ?? 'salle ?'}
                            </span>
                          ) : null}
                          {grand && p.creneau.professeur ? (
                            <span className="text-[0.66rem] font-semibold opacity-75 truncate order-first">
                              {p.creneau.professeur}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {jourActuel && jours.includes(jourActuel) && minuteActuelle >= origine && minuteActuelle <= enMinutes(amplitude.fin) ? (
              <div
                data-ligne-maintenant
                className="ligne-maintenant entree-ligne"
                style={{
                  top: (minuteActuelle - origine) * PX_PAR_MINUTE + HAUT,
                  left: `calc(${(jours.indexOf(jourActuel) / jours.length) * 100}%)`,
                  width: `calc(${(1 / jours.length) * 100}%)`,
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
