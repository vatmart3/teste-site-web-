import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Creneau, Jour } from './types'
import { useRegistre, MATIERES_REGISTRE, META_PLANNING } from './store/useRegistre'
import { useMinute } from './lib/hooks'
import { classerDevoirs, coursEnCours, prochainCours } from './lib/selection'
import { formatDateLongue, formatDuree, joursRestants } from './lib/temps'
import {
  demanderNotifications,
  etatNotifications,
  notifier,
  prochainAffiche,
  rappelCourant,
  type EtatNotifications,
} from './lib/rappels'
import { Planning } from './components/semaine/Planning'
import { EcranMatiere } from './components/fiche/EcranMatiere'
import { Outils } from './components/outils/Outils'
import { EditeurPlanning } from './components/edition/EditeurPlanning'

const ModeFocus = lazy(() =>
  import('./components/focus/ModeFocus').then((m) => ({ default: m.ModeFocus })),
)

type Vue = 'planning' | 'outils' | 'edition'

export default function App() {
  const [vue, setVue] = useState<Vue>('planning')
  const [focus, setFocus] = useState(false)
  const [ouvert, setOuvert] = useState<Creneau | null>(null)
  const maintenant = useMinute()

  const creneaux = useRegistre((s) => s.creneaux)
  const devoirsBruts = useRegistre((s) => s.devoirs)
  const dateExamen = useRegistre((s) => s.dateExamen)
  const semestre = useRegistre((s) => s.semestre)
  const quinzaine = useRegistre((s) => s.quinzaine)
  const rappelMinutes = useRegistre((s) => s.rappelMinutes)
  const rappelsSysteme = useRegistre((s) => s.rappelsSysteme)
  const definirRappelsSysteme = useRegistre((s) => s.definirRappelsSysteme)

  const matieres = MATIERES_REGISTRE.matieres
  const parCode = useMemo(() => Object.fromEntries(matieres.map((m) => [m.code, m])), [matieres])

  const cours = coursEnCours(creneaux, maintenant, semestre, quinzaine)
  const suivant = prochainCours(creneaux, maintenant, semestre, quinzaine)
  const jAvantExamen = joursRestants(dateExamen, maintenant)
  const rappel = rappelCourant(creneaux, maintenant, semestre, quinzaine, rappelMinutes)
  const prochain = prochainAffiche(creneaux, maintenant, semestre, quinzaine)
  const retards = useMemo(
    () => classerDevoirs(devoirsBruts, maintenant).filter((d) => d.enRetard),
    [devoirsBruts, maintenant],
  )

  // ── Notifications système : une seule par cours ───────────────────────────
  const [etatNotifs, setEtatNotifs] = useState<EtatNotifications>(() => etatNotifications())
  const dejaNotifie = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!rappelsSysteme || etatNotifs !== 'active' || !rappel || rappel.enCours) return
    if (rappel.dans > rappelMinutes) return
    const cle = `${rappel.creneau.id}-${maintenant.toDateString()}`
    if (dejaNotifie.current.has(cle)) return
    dejaNotifie.current.add(cle)
    const m = parCode[rappel.creneau.code]
    notifier(
      `${m?.nomCourt ?? rappel.creneau.matiere} dans ${rappel.dans} min`,
      `${rappel.creneau.debut.replace(':', 'h')} · ${rappel.creneau.salle ?? 'salle non indiquée'}${
        rappel.creneau.professeur ? ` · ${rappel.creneau.professeur}` : ''
      }`,
      cle,
    )
  }, [rappel, rappelsSysteme, etatNotifs, rappelMinutes, maintenant, parCode])

  const activerNotifications = async () => {
    const r = await demanderNotifications()
    setEtatNotifs(r)
    definirRappelsSysteme(r === 'active')
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const c = e.target as HTMLElement | null
      const saisie =
        c && (c.tagName === 'INPUT' || c.tagName === 'TEXTAREA' || c.tagName === 'SELECT' || c.isContentEditable)
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
          matiere={undefined}
          joursAvantExamen={jAvantExamen}
          onSortir={() => setFocus(false)}
        />
      </Suspense>
    )
  }

  const matiereRappel = rappel ? parCode[rappel.creneau.code] : undefined

  return (
    <div className="min-h-dvh flex flex-col">
      {/* L'heure, en grand, au-dessus du planning. Rien d'autre. */}
      <Enseigne
        maintenant={maintenant}
        jAvantExamen={jAvantExamen}
        retards={retards.length}
        vue={vue}
        onVue={setVue}
        onFocus={() => setFocus(true)}
      />

      {rappel && matiereRappel ? (
        <button
          type="button"
          onClick={() => ouvrir(rappel.creneau)}
          className={`rappel w-full text-left px-4 sm:px-8 py-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 ${
            rappel.imminent ? 'rappel-imminent' : ''
          }`}
          style={{ ['--teinte' as string]: matiereRappel.couleur }}
        >
          <span className="anton text-[clamp(0.95rem,2vw,1.35rem)]">
            {rappel.enCours
              ? `En cours — ${matiereRappel.nomCourt}`
              : `${matiereRappel.nomCourt} dans ${rappel.dans} min`}
          </span>
          <span className="chiffre text-[0.78rem] font-semibold">
            {rappel.creneau.debut.replace(':', 'h')}–{rappel.creneau.fin.replace(':', 'h')} ·{' '}
            {rappel.creneau.salle ?? 'salle non indiquée'}
            {rappel.creneau.professeur ? ` · ${rappel.creneau.professeur}` : ''}
          </span>
          {rappel.enCours && cours ? (
            <span className="chiffre text-[0.78rem] ml-auto">{formatDuree(cours.restantMinutes)} restantes</span>
          ) : null}
        </button>
      ) : null}

      <main className="flex-1 pt-4 pb-2">
        {vue === 'planning' ? (
          <Planning
            creneaux={creneaux}
            matieres={matieres}
            jours={joursAffiches(creneaux, META_PLANNING.jours)}
            bornes={META_PLANNING.bornes}
            amplitude={META_PLANNING.amplitude}
            maintenant={maintenant}
            semestre={semestre}
            quinzaine={quinzaine}
            onOuvrir={ouvrir}
          />
        ) : null}
        {vue === 'outils' ? <Outils /> : null}
        {vue === 'edition' ? <EditeurPlanning /> : null}
      </main>

      {vue === 'planning' ? (
        <footer className="px-4 sm:px-8 py-4 filet-t flex flex-wrap items-baseline gap-x-6 gap-y-2">
          {prochain ? (
            <p className="flex items-baseline gap-3">
              <span className="folio">Ensuite</span>
              <span className="anton text-[clamp(0.95rem,2vw,1.3rem)]" style={{ color: parCode[prochain.creneau.code]?.couleur }}>
                {parCode[prochain.creneau.code]?.nomCourt ?? prochain.creneau.matiere}
              </span>
              <span className="chiffre text-folio">
                {prochain.dans !== null ? `dans ${formatDuree(prochain.dans)}` : prochain.jour}
                {' · '}
                {prochain.creneau.debut.replace(':', 'h')}
                {prochain.creneau.salle ? ` · ${prochain.creneau.salle}` : ''}
              </span>
            </p>
          ) : (
            <p className="folio">Plus aucun cours cette semaine.</p>
          )}

          <div className="ml-auto flex items-center gap-4">
            {etatNotifs === 'a-demander' ? (
              <button type="button" onClick={() => void activerNotifications()} className="bouton bouton-discret">
                Activer les rappels
              </button>
            ) : etatNotifs === 'active' && rappelsSysteme ? (
              <span className="folio">Rappels {rappelMinutes} min avant · actifs</span>
            ) : etatNotifs === 'refusee' ? (
              <span className="folio">Notifications bloquées par le navigateur</span>
            ) : null}
            <span className="folio">
              F · plein écran
            </span>
          </div>
        </footer>
      ) : null}

      {ouvert && parCode[ouvert.code] ? (
        <EcranMatiere
          creneau={ouvert}
          matiere={parCode[ouvert.code]}
          matieres={matieres}
          maintenant={maintenant}
          onFermer={() => setOuvert(null)}
        />
      ) : null}
    </div>
  )
}

function Enseigne({
  maintenant,
  jAvantExamen,
  retards,
  vue,
  onVue,
  onFocus,
}: {
  maintenant: Date
  jAvantExamen: number
  retards: number
  vue: Vue
  onVue: (v: Vue) => void
  onFocus: () => void
}) {
  const heure = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <header className="px-4 sm:px-8 pt-5 pb-3">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="flex items-end gap-5">
          <p className="anton chiffre entree-heure leading-[0.8] text-[clamp(3.4rem,10vw,7.5rem)]">
            {heure}
          </p>
          <div className="pb-2">
            <p className="anton entree-fondu text-[clamp(0.85rem,1.7vw,1.15rem)] text-encre-clair">
              {formatDateLongue(maintenant)}
            </p>
            <p className="folio entree-fondu mt-0.5" style={{ ['--i' as string]: 1 }}>
              J − {jAvantExamen} avant l’examen
              {retards ? ` · ${retards} devoir${retards > 1 ? 's' : ''} en retard` : ''}
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1" aria-label="Vues">
          {(
            [
              ['planning', 'Planning'],
              ['outils', 'Outils'],
              ['edition', 'Emploi du temps'],
            ] as [Vue, string][]
          ).map(([id, libelle]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={vue === id}
              onClick={() => onVue(id)}
              className="onglet"
            >
              {libelle}
            </button>
          ))}
          <button type="button" onClick={onFocus} className="onglet" title="Mode plein écran (F)">
            Focus
          </button>
        </nav>
      </div>
    </header>
  )
}

function joursAffiches(creneaux: Creneau[], tous: Jour[]): Jour[] {
  return tous.filter((j) => j !== 'samedi' || creneaux.some((c) => c.jour === 'samedi'))
}
