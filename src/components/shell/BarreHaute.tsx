import { useMemo, useState } from 'react'
import type { Creneau, Matiere } from '../../types'
import { IconeCloche, IconeLoupe, IconeMenu } from './Icones'
import { normaliser } from '../../data/pcg'

/** Barre du haut : titre de la vue, recherche, heure, période. */
export function BarreHaute({
  titre,
  maintenant,
  semestre,
  quinzaine,
  rappels,
  matieres,
  creneaux,
  onOuvrir,
  onMenu,
  onReglages,
}: {
  titre: string
  maintenant: Date
  semestre: 1 | 2
  quinzaine: 'Q1' | 'Q2'
  rappels: number
  matieres: Matiere[]
  creneaux: Creneau[]
  onOuvrir: (c: Creneau) => void
  onMenu: () => void
  onReglages: () => void
}) {
  const [requete, setRequete] = useState('')

  const resultats = useMemo(() => {
    const q = normaliser(requete)
    if (q.length < 2) return []
    const vus = new Set<string>()
    return creneaux
      .filter((c) => {
        const m = matieres.find((x) => x.code === c.code)
        const cle = normaliser(`${c.matiere} ${c.code} ${c.professeur ?? ''} ${c.salle ?? ''} ${m?.nom ?? ''}`)
        if (!cle.includes(q)) return false
        if (vus.has(c.code)) return false
        vus.add(c.code)
        return true
      })
      .slice(0, 6)
  }, [requete, creneaux, matieres])

  const heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="flex items-center gap-3 sm:gap-4">
      <button type="button" onClick={onMenu} className="bouton bouton-discret xl:hidden" aria-label="Menu">
        <IconeMenu />
      </button>

      <h1 className="text-[1.35rem] font-extrabold shrink-0">{titre}</h1>

      <div className="relative flex-1 max-w-[22rem] hidden sm:block">
        <label className="invisible-lecteur" htmlFor="recherche">
          Chercher une matière, un professeur, une salle
        </label>
        <input
          id="recherche"
          type="search"
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          placeholder="Chercher une matière, une salle…"
          className="champ pilule pl-4 pr-10"
          autoComplete="off"
        />
        <IconeLoupe className="absolute right-3.5 top-1/2 -translate-y-1/2 text-encre-clair pointer-events-none" />

        {resultats.length ? (
          <ul className="absolute z-40 left-0 right-0 top-full mt-2 carte p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
            {resultats.map((c) => {
              const m = matieres.find((x) => x.code === c.code)
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onOuvrir(c)
                      setRequete('')
                    }}
                    className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-[var(--color-bande)] flex items-center gap-3"
                  >
                    <span
                      style={{ width: 9, height: 9, borderRadius: 999, background: m?.couleur, display: 'inline-block' }}
                      aria-hidden="true"
                    />
                    <span className="text-menu font-semibold truncate">{m?.nom ?? c.matiere}</span>
                    <span className="folio ml-auto chiffre shrink-0">
                      {c.jour.slice(0, 3)} {c.debut.replace(':', 'h')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <p className="anton chiffre text-[1.6rem] leading-none hidden sm:block" title="Heure actuelle">
          {heure}
        </p>

        <button
          type="button"
          onClick={onReglages}
          className="bouton bouton-discret relative"
          aria-label={`Rappels — ${rappels} cours à venir`}
        >
          <IconeCloche />
          {rappels ? (
            <span
              className="absolute -top-1 -right-1 chiffre text-[0.6rem] font-bold text-white grid place-items-center"
              style={{ background: 'var(--color-debit)', width: 17, height: 17, borderRadius: 999 }}
            >
              {rappels}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onReglages}
          className="bouton bouton-plein pilule chiffre"
          title="Semestre et quinzaine en cours"
        >
          S{semestre} · {quinzaine}
        </button>
      </div>
    </header>
  )
}
