import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import type { Creneau, Jour, Matiere } from '../../types'
import {
  enMinutes,
  formatHeure,
  jourDeLaDate,
  lundiDeLaSemaine,
  minutesDeLaDate,
  memeJour,
} from '../../lib/temps'
import { creneauActif } from '../../lib/selection'
import { useMouvementReduit } from '../../lib/hooks'

const PX_PAR_MINUTE = 1.06
/** Marge haute : la première borne horaire doit rester lisible. */
const DECALAGE = 12

interface Pose {
  creneau: Creneau
  haut: number
  hauteur: number
  voie: number
  voies: number
}

/** Répartit les créneaux qui se chevauchent en voies parallèles. */
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
      haut: (debut - origine) * PX_PAR_MINUTE + DECALAGE,
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

export function GrilleSemaine({
  creneaux,
  matieres,
  jours,
  bornes,
  amplitude,
  maintenant,
  semestre,
  quinzaine,
  creneauOuvert,
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
  creneauOuvert: string | null
  onOuvrir: (c: Creneau) => void
}) {
  const racine = useRef<HTMLDivElement>(null)
  const mouvementReduit = useMouvementReduit()

  const origine = enMinutes(amplitude.debut)
  const hauteur = (enMinutes(amplitude.fin) - origine) * PX_PAR_MINUTE + DECALAGE * 2

  const teinteParCode = useMemo(
    () => Object.fromEntries(matieres.map((m) => [m.code, m.teinte])),
    [matieres],
  )
  const nomCourtParCode = useMemo(
    () => Object.fromEntries(matieres.map((m) => [m.code, m.nomCourt])),
    [matieres],
  )

  const actifs = useMemo(
    () => creneaux.filter((c) => creneauActif(c, semestre, quinzaine)),
    [creneaux, semestre, quinzaine],
  )

  const parJour = useMemo(
    () =>
      jours.map((jour) => ({
        jour,
        poses: poser(
          actifs.filter((c) => c.jour === jour),
          origine,
        ),
      })),
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

  // Une seule séquence orchestrée, au montage. Ensuite, plus rien de gratuit.
  useLayoutEffect(() => {
    if (mouvementReduit || !racine.current) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('[data-filet-horaire]', {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 0.5,
        stagger: 0.022,
      })
      tl.from(
        '[data-bloc]',
        {
          opacity: 0,
          y: 10,
          rotateX: -18,
          transformOrigin: 'top center',
          duration: 0.36,
          stagger: { each: 0.017, from: 'start' },
        },
        '-=0.28',
      )
      if (racine.current?.querySelector('[data-ligne-maintenant]')) {
        tl.from('[data-ligne-maintenant]', { opacity: 0, duration: 0.35 }, '-=0.15')
      }
    }, racine)
    return () => ctx.revert()
  }, [mouvementReduit])

  // Défile jusqu'à l'heure courante au premier affichage sur mobile.
  const conteneur = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!racine.current || !jourActuel) return
    const cible = (minuteActuelle - origine) * PX_PAR_MINUTE - 140
    if (cible > 0) racine.current.scrollTop = cible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={racine} className="filet-t overflow-auto" style={{ maxHeight: 'min(78vh, 820px)' }}>
      <div className="min-w-[700px]">
      {/* En-tête des colonnes : les jours, comme des intitulés de colonnes de registre. */}
      <div className="flex sticky top-0 z-30 bg-papier filet-b">
        <div className="w-[52px] sm:w-[62px] shrink-0 filet-r" aria-hidden="true" />
        <div className="flex flex-1">
          {jours.map((jour) => {
            const d = dateDuJour(jour)
            const estAujourdhui = memeJour(d, maintenant)
            const passe = d < maintenant && !estAujourdhui
            return (
              <div
                key={jour}
                className={`flex-1 filet-r px-2 py-1.5 ${passe ? 'jour-passe' : ''}`}
              >
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-menu ${estAujourdhui ? 'font-bold' : 'font-semibold'}`}
                    style={estAujourdhui ? { textDecoration: 'underline', textUnderlineOffset: 4 } : undefined}
                  >
                    {jour}
                  </span>
                  <span className="folio chiffre">{d.getDate()}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div ref={conteneur}>
        <div className="flex" style={{ height: hauteur }}>
          {/* Gouttière horaire + marge perforée */}
          <div className="w-[52px] sm:w-[62px] shrink-0 relative filet-r perforation">
            {bornes.map((b) => {
              const y = (enMinutes(b) - origine) * PX_PAR_MINUTE + DECALAGE
              return (
                <div
                  key={b}
                  className="absolute right-1.5 -translate-y-1/2 chiffre text-folio text-encre-clair bg-papier px-0.5"
                  style={{ top: y }}
                >
                  {formatHeure(enMinutes(b))}
                </div>
              )
            })}
          </div>

          <div className="relative flex-1">
            {/* Filets horaires, tracés sur toute la largeur */}
            {bornes.map((b) => {
              const y = (enMinutes(b) - origine) * PX_PAR_MINUTE + DECALAGE
              return (
                <div
                  key={b}
                  data-filet-horaire
                  className="absolute left-0 right-0 border-t border-[color-mix(in_srgb,var(--color-filet)_75%,transparent)]"
                  style={{ top: y }}
                />
              )
            })}

            <div className="absolute inset-0 flex">
              {parJour.map(({ jour, poses }) => {
                const d = dateDuJour(jour)
                const estAujourdhui = memeJour(d, maintenant)
                const passe = d < maintenant && !estAujourdhui
                return (
                  <div
                    key={jour}
                    className={`relative flex-1 filet-r ${passe ? 'jour-passe' : ''}`}
                    style={{ perspective: '900px' }}
                  >
                    {poses.map((p) => {
                      const debut = enMinutes(p.creneau.debut)
                      const fin = enMinutes(p.creneau.fin)
                      const actuel =
                        estAujourdhui && minuteActuelle >= debut && minuteActuelle < fin
                      const teinte = teinteParCode[p.creneau.code] ?? 'papier'
                      const largeur = 100 / p.voies
                      const compact = p.hauteur < 46
                      const periode = [
                        p.creneau.semestre ? `S${p.creneau.semestre}` : null,
                        p.creneau.quinzaine,
                      ]
                        .filter(Boolean)
                        .join(' ')
                      return (
                        <button
                          key={p.creneau.id}
                          data-bloc
                          type="button"
                          onClick={() => onOuvrir(p.creneau)}
                          data-actuel={actuel}
                          aria-current={actuel ? 'time' : undefined}
                          aria-expanded={creneauOuvert === p.creneau.id}
                          className={`bloc-cours teinte-${teinte} ${
                            creneauOuvert === p.creneau.id ? 'ring-2 ring-[var(--color-or)]' : ''
                          }`}
                          style={{
                            top: p.haut,
                            height: Math.max(18, p.hauteur - 2),
                            left: `calc(${p.voie * largeur}% + 2px)`,
                            width: `calc(${largeur}% - 4px)`,
                          }}
                        >
                          <span
                            className={`block leading-tight min-h-0 ${
                              actuel ? 'font-bold text-[0.85rem]' : 'font-semibold text-[0.76rem]'
                            }`}
                            style={{
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              overflow: 'hidden',
                            }}
                          >
                            {p.hauteur < 100
                              ? (nomCourtParCode[p.creneau.code] ?? p.creneau.matiere)
                              : p.creneau.matiere}
                          </span>
                          {!compact && (
                            <span className="block text-[0.7rem] leading-tight text-encre-clair mt-0.5 truncate shrink-0">
                              {p.creneau.professeur}
                            </span>
                          )}
                          {!compact && p.hauteur > 62 && (
                            <span className="block chiffre text-folio text-encre-clair mt-0.5 truncate shrink-0">
                              {p.creneau.salle ?? '— salle ?'}
                              {p.creneau.groupe ? ` · ${p.creneau.groupe.replace('STS1 CG_', '')}` : ''}
                              {periode ? (
                                <span className="ml-1.5 px-1 border border-[var(--color-filet-fort)]">
                                  {periode}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Ligne « maintenant » : elle traverse la journée en cours. */}
            {jourActuel && jours.includes(jourActuel) && minuteActuelle >= origine && minuteActuelle <= enMinutes(amplitude.fin) ? (
              <div
                data-ligne-maintenant
                className="ligne-maintenant"
                style={{
                  top: (minuteActuelle - origine) * PX_PAR_MINUTE + DECALAGE,
                  left: `${(jours.indexOf(jourActuel) / jours.length) * 100}%`,
                  width: `${(1 / jours.length) * 100}%`,
                }}
              >
                <span className="absolute -top-2.5 right-1 chiffre text-[0.62rem] text-debit bg-papier px-1">
                  {formatHeure(minuteActuelle)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
