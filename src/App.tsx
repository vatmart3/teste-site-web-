import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import type { Creneau } from './types'
import { useRegistre, MATIERES_REGISTRE, META_PLANNING } from './store/useRegistre'
import { useMinute } from './lib/hooks'
import { coursEnCours, prochainCours, matiereLaMoinsRevisee, etatDesMatieres, classerDevoirs } from './lib/selection'
import { joursRestants } from './lib/temps'
import { Accueil } from './components/semaine/Accueil'
import { PanneauFiche } from './components/fiche/PanneauFiche'
import { Outils } from './components/outils/Outils'
import { EditeurPlanning } from './components/edition/EditeurPlanning'

// Three.js n'est chargé qu'à l'entrée en mode Focus : l'accueil reste léger.
const ModeFocus = lazy(() =>
  import('./components/focus/ModeFocus').then((m) => ({ default: m.ModeFocus })),
)

type Vue = 'semaine' | 'outils' | 'edition'

const VUES: { id: Vue; nom: string }[] = [
  { id: 'semaine', nom: 'Semaine' },
  { id: 'outils', nom: 'Outils BTS CG' },
  { id: 'edition', nom: 'Emploi du temps' },
]

export default function App() {
  const [vue, setVue] = useState<Vue>('semaine')
  const [focus, setFocus] = useState(false)
  const [ouvert, setOuvert] = useState<Creneau | null>(null)
  const maintenant = useMinute()

  const creneaux = useRegistre((s) => s.creneaux)
  const notes = useRegistre((s) => s.notes)
  const devoirsBruts = useRegistre((s) => s.devoirs)
  const chapitresFaits = useRegistre((s) => s.chapitresFaits)
  const revisions = useRegistre((s) => s.revisions)
  const dateExamen = useRegistre((s) => s.dateExamen)
  const definirDateExamen = useRegistre((s) => s.definirDateExamen)
  const semestre = useRegistre((s) => s.semestre)
  const quinzaine = useRegistre((s) => s.quinzaine)

  const matieres = MATIERES_REGISTRE.matieres

  const cours = coursEnCours(creneaux, maintenant, semestre, quinzaine)
  const suivant = prochainCours(creneaux, maintenant, semestre, quinzaine)
  const jAvantExamen = joursRestants(dateExamen, maintenant)

  const moinsRevisee = useMemo(() => {
    const devoirs = classerDevoirs(devoirsBruts, maintenant)
    return matiereLaMoinsRevisee(
      etatDesMatieres(matieres, notes, devoirs, chapitresFaits, revisions, maintenant),
    )
  }, [matieres, notes, devoirsBruts, chapitresFaits, revisions, maintenant])

  // F : entrer en mode Focus. Échap : en sortir (géré aussi dans le composant).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null
      const saisie =
        cible &&
        (cible.tagName === 'INPUT' ||
          cible.tagName === 'TEXTAREA' ||
          cible.tagName === 'SELECT' ||
          cible.isContentEditable)
      if (saisie || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setFocus((f) => !f)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const ouvrir = useCallback((c: Creneau) => setOuvert(c), [])

  if (focus) {
    return (
      <Suspense fallback={<div className="focus-encre fixed inset-0 z-50" aria-busy="true" />}>
        <ModeFocus
          cours={cours}
          suivant={suivant}
          matiere={moinsRevisee?.matiere}
          joursAvantExamen={jAvantExamen}
          onSortir={() => setFocus(false)}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="filet-b sticky top-0 z-30 bg-papier">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 px-4 sm:px-6 pt-3 pb-2">
          <h1
            className="leading-none"
            style={{ fontFamily: 'var(--font-titre)', fontSize: '1.55rem', letterSpacing: '-0.02em' }}
          >
            Registre
          </h1>
          <p className="folio">
            {META_PLANNING.eleve} · {META_PLANNING.classe} · {META_PLANNING.etablissement}
          </p>
          <div className="ml-auto flex items-baseline gap-4">
            <label className="folio flex items-baseline gap-1.5">
              Examen
              <input
                type="date"
                value={dateExamen}
                onChange={(e) => definirDateExamen(e.target.value)}
                className="champ chiffre w-[8.5rem] text-folio"
                aria-label="Date de l'examen"
              />
              <span className="chiffre text-menu font-bold text-or">J − {jAvantExamen}</span>
            </label>
            <button type="button" onClick={() => setFocus(true)} className="bouton bouton-discret">
              Focus
              <span className="folio">F</span>
            </button>
          </div>
        </div>

        <nav className="flex overflow-x-auto" aria-label="Vues du registre">
          {VUES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVue(v.id)}
              aria-selected={vue === v.id}
              role="tab"
              className="onglet"
            >
              {v.nom}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        {vue === 'semaine' ? (
          <Accueil
            matieres={matieres}
            maintenant={maintenant}
            creneauOuvert={ouvert?.id ?? null}
            onOuvrir={ouvrir}
            onAllerAuxOutils={() => setVue('outils')}
          />
        ) : null}
        {vue === 'outils' ? <Outils /> : null}
        {vue === 'edition' ? <EditeurPlanning /> : null}
      </main>

      <footer className="filet-t px-4 sm:px-6 py-3 folio flex flex-wrap gap-x-6 gap-y-1">
        <span>Source de l'emploi du temps : {META_PLANNING.source}</span>
        <span className="chiffre">{creneaux.length} créneaux</span>
        <span>
          Touche <span className="chiffre">F</span> pour le mode Focus, <span className="chiffre">Échap</span> pour en sortir.
        </span>
      </footer>

      {ouvert ? (
        <PanneauFiche
          creneau={ouvert}
          matiere={matieres.find((m) => m.code === ouvert.code)}
          matieres={matieres}
          maintenant={maintenant}
          onFermer={() => setOuvert(null)}
        />
      ) : null}
    </div>
  )
}
