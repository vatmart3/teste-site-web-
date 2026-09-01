import { useEffect } from 'react'
import type { Creneau, Jour, Matiere } from '../../types'
import { formatDuree } from '../../lib/temps'
import { useMouvementReduit, useSeconde } from '../../lib/hooks'
import type { EtatCours } from '../../lib/selection'
import { Anneau } from './Anneau'
import { MATIERES_REGISTRE } from '../../store/useRegistre'

export function ModeFocus({
  cours,
  suivant,
  matiere,
  joursAvantExamen,
  onSortir,
}: {
  cours: EtatCours | null
  suivant: { creneau: Creneau; jour: Jour; memeJour: boolean } | null
  matiere: Matiere | undefined
  joursAvantExamen: number
  onSortir: () => void
}) {
  const maintenant = useSeconde(true)
  const mouvementReduit = useMouvementReduit()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSortir()
    }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onSortir])

  const couleur =
    MATIERES_REGISTRE.matieres.find((m) => m.code === cours?.creneau.code)?.couleur ?? '#FFC93C'
  const heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const secondes = String(maintenant.getSeconds()).padStart(2, '0')

  return (
    <div className="focus-encre fixed inset-0 z-50 overflow-hidden" role="region" aria-label="Mode focus">
      <Anneau avancement={cours?.avancement ?? 0} anime={!mouvementReduit} couleur={couleur} />

      <div className="relative h-full flex flex-col justify-between px-[6vw] py-[5vh]">
        <div className="flex items-baseline justify-between">
          <p
            className="chiffre leading-none"
            style={{ fontFamily: 'var(--font-titre)', fontSize: 'clamp(4.5rem, 15vw, 13rem)' }}
          >
            {heure}
            <span className="opacity-40" style={{ fontSize: '0.24em' }}>
              :{secondes}
            </span>
          </p>
          <p className="chiffre text-[0.75rem] opacity-45">J − {joursAvantExamen}</p>
        </div>

        <div className="max-w-[46ch]">
          {cours ? (
            <>
              <p
                className="leading-[1.02]"
                style={{ fontFamily: 'var(--font-titre)', fontSize: 'clamp(2rem, 6.2vw, 5rem)', color: couleur, textTransform: 'uppercase' }}
              >
                {cours.creneau.matiere}
              </p>
              <p className="mt-3 chiffre text-[clamp(1rem,2.4vw,1.6rem)] opacity-70">
                {cours.creneau.salle ?? 'salle non indiquée'}
                {cours.creneau.professeur ? ` · ${cours.creneau.professeur}` : ''}
              </p>
              <p className="mt-6 chiffre text-[clamp(1rem,2.4vw,1.5rem)]">
                {formatDuree(cours.restantMinutes)} restantes
              </p>
              <div className="barre-progression mt-3 w-full max-w-[42rem]">
                <span style={{ width: `${Math.round(cours.avancement * 100)}%`, background: couleur }} />
              </div>
            </>
          ) : (
            <>
              <p
                className="leading-[1.02] opacity-75"
                style={{ fontFamily: 'var(--font-titre)', fontSize: 'clamp(1.8rem, 5vw, 4rem)' }}
              >
                Pas de cours en ce moment
              </p>
              {matiere ? (
                <p className="mt-4 chiffre text-[clamp(0.95rem,2vw,1.3rem)] opacity-60">
                  À reprendre : {matiere.nom}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-end justify-between gap-6">
          <p className="chiffre text-[clamp(0.85rem,1.8vw,1.15rem)] opacity-60">
            {suivant
              ? `Ensuite : ${suivant.creneau.matiere} à ${suivant.creneau.debut.replace(':', 'h')}${
                  suivant.memeJour ? '' : ` (${suivant.jour})`
                }${suivant.creneau.salle ? ` — ${suivant.creneau.salle}` : ''}`
              : 'Plus rien au programme'}
          </p>
          <button
            type="button"
            onClick={onSortir}
            className="chiffre text-[0.72rem] opacity-40 hover:opacity-90 underline underline-offset-4"
          >
            Échap
          </button>
        </div>
      </div>
    </div>
  )
}
