import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Creneau, Jour, Matiere } from './types'
import { useRegistre, MATIERES_REGISTRE, META_PLANNING } from './store/useRegistre'
import { useMinute } from './lib/hooks'
import { classerDevoirs, coursEnCours, creneauActif } from './lib/selection'
import { JOURS, enMinutes, formatDuree, joursRestants, jourDeLaDate, minutesDeLaDate } from './lib/temps'
import { moyenneGenerale } from './lib/moyennes'
import { formatDecimal } from './lib/compta'
import { demanderNotifications, etatNotifications, notifier, rappelCourant, type EtatNotifications } from './lib/rappels'
import { BarreLaterale, type Vue } from './components/shell/BarreLaterale'
import { BarreHaute } from './components/shell/BarreHaute'
import { PanneauDroit, type EntreeCours } from './components/shell/PanneauDroit'
import { IconeFleche } from './components/shell/Icones'
import { Planning } from './components/semaine/Planning'
import { VueMois } from './components/semaine/VueMois'
import { EcranMatiere } from './components/fiche/EcranMatiere'
import { Outils } from './components/outils/Outils'
import { EditeurPlanning } from './components/edition/EditeurPlanning'
import { VueDevoirs, VueMatieres, VueNotes, VueReglages } from './components/vues/Vues'

const ModeFocus = lazy(() =>
  import('./components/focus/ModeFocus').then((m) => ({ default: m.ModeFocus })),
)

const TITRES: Record<Vue, string> = {
  planning: 'Planning',
  matieres: 'Matières',
  devoirs: 'Devoirs',
  notes: 'Notes',
  outils: 'Outils BTS CG',
  edition: 'Emploi du temps',
  reglages: 'Réglages',
}

export default function App() {
  const [vue, setVue] = useState<Vue>('planning')
  const [focus, setFocus] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [ouvert, setOuvert] = useState<{ matiere: Matiere; creneau: Creneau | null } | null>(null)
  const [decalageMois, setDecalageMois] = useState(0)
  const maintenant = useMinute()

  const creneaux = useRegistre((s) => s.creneaux)
  const notes = useRegistre((s) => s.notes)
  const devoirsBruts = useRegistre((s) => s.devoirs)
  const chapitresFaits = useRegistre((s) => s.chapitresFaits)
  const dateExamen = useRegistre((s) => s.dateExamen)
  const semestre = useRegistre((s) => s.semestre)
  const quinzaine = useRegistre((s) => s.quinzaine)
  const rappelMinutes = useRegistre((s) => s.rappelMinutes)
  const rappelsSysteme = useRegistre((s) => s.rappelsSysteme)
  const definirRappelsSysteme = useRegistre((s) => s.definirRappelsSysteme)
  const vuePlanning = useRegistre((s) => s.vuePlanning)
  const definirVuePlanning = useRegistre((s) => s.definirVuePlanning)

  const matieres = MATIERES_REGISTRE.matieres
  const parCode = useMemo(() => Object.fromEntries(matieres.map((m) => [m.code, m])), [matieres])

  const devoirs = useMemo(() => classerDevoirs(devoirsBruts, maintenant), [devoirsBruts, maintenant])
  const cours = coursEnCours(creneaux, maintenant, semestre, quinzaine)
  const jAvantExamen = joursRestants(dateExamen, maintenant)
  const rappel = rappelCourant(creneaux, maintenant, semestre, quinzaine, rappelMinutes)

  const coefficients = useMemo(
    () => Object.fromEntries(matieres.map((m) => [m.code, m.coefficient])),
    [matieres],
  )
  const generale = moyenneGenerale(notes, coefficients)

  const aVenir = useMemo(
    () => prochainsCours(creneaux, maintenant, semestre, quinzaine, 5),
    [creneaux, maintenant, semestre, quinzaine],
  )

  // ── Notifications système : une par cours et par jour ─────────────────────
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
      `${rappel.creneau.debut.replace(':', 'h')} · ${rappel.creneau.salle ?? 'salle non indiquée'}`,
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

  const ouvrirCreneau = useCallback(
    (c: Creneau) => {
      const m = parCode[c.code]
      if (m) setOuvert({ matiere: m, creneau: c })
    },
    [parCode],
  )
  const ouvrirMatiere = useCallback(
    (code: string) => {
      const m = parCode[code]
      if (!m) return
      const c = creneaux.find((x) => x.code === code && creneauActif(x, semestre, quinzaine)) ?? null
      setOuvert({ matiere: m, creneau: c })
    },
    [parCode, creneaux, semestre, quinzaine],
  )

  if (focus) {
    return (
      <Suspense fallback={<div className="focus-encre fixed inset-0 z-50" aria-busy="true" />}>
        <ModeFocus
          cours={cours}
          suivant={
            aVenir[0] && !aVenir[0].enCours
              ? { creneau: aVenir[0].creneau, jour: aVenir[0].jour, memeJour: aVenir[0].dans !== null }
              : null
          }
          matiere={undefined}
          joursAvantExamen={jAvantExamen}
          onSortir={() => setFocus(false)}
        />
      </Suspense>
    )
  }

  const moisAffiche = new Date(maintenant.getFullYear(), maintenant.getMonth() + decalageMois, 1)
  const matiereRappel = rappel ? parCode[rappel.creneau.code] : undefined
  const jours = JOURS.filter((j) => j !== 'samedi' || creneaux.some((c) => c.jour === 'samedi'))

  return (
    <div className="min-h-dvh p-2 sm:p-5 lg:p-7">
      <div
        className="carte bg-papier mx-auto w-full max-w-[1560px] p-3 sm:p-4 flex gap-4"
        style={{ minHeight: 'calc(100dvh - 1rem)', boxShadow: '0 40px 90px -30px rgba(0,0,0,0.65)' }}
      >
        {/* Menu latéral : toujours là au-delà de 1280px, en tiroir en dessous */}
        <div className="hidden xl:block">
          <BarreLaterale
            vue={vue}
            onVue={setVue}
            matieres={matieres}
            devoirsOuverts={devoirs.filter((d) => !d.fait).length}
            devoirsEnRetard={devoirs.filter((d) => d.enRetard).length}
            moyenne={generale.valeur !== null ? formatDecimal(generale.valeur) : null}
          />
        </div>

        {menuOuvert ? (
          <div className="fixed inset-0 z-40 xl:hidden">
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setMenuOuvert(false)}
              className="absolute inset-0 bg-[rgba(0,0,0,0.6)]"
            />
            <div className="relative h-full p-3">
              <BarreLaterale
                vue={vue}
                onVue={(v) => {
                  setVue(v)
                  setMenuOuvert(false)
                }}
                matieres={matieres}
                devoirsOuverts={devoirs.filter((d) => !d.fait).length}
                devoirsEnRetard={devoirs.filter((d) => d.enRetard).length}
                moyenne={generale.valeur !== null ? formatDecimal(generale.valeur) : null}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <BarreHaute
            titre={TITRES[vue]}
            maintenant={maintenant}
            semestre={semestre}
            quinzaine={quinzaine}
            rappels={rappel && !rappel.enCours ? 1 : 0}
            matieres={matieres}
            creneaux={creneaux}
            onOuvrir={ouvrirCreneau}
            onMenu={() => setMenuOuvert(true)}
            onReglages={() => setVue('reglages')}
          />

          {rappel && matiereRappel ? (
            <button
              type="button"
              onClick={() => ouvrirCreneau(rappel.creneau)}
              className={`rappel w-full text-left px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 ${
                rappel.imminent ? 'rappel-imminent' : ''
              }`}
              style={{ ['--teinte' as string]: matiereRappel.couleur }}
            >
              <span className="anton text-[1.15rem]">
                {rappel.enCours
                  ? `En cours — ${matiereRappel.nomCourt}`
                  : `${matiereRappel.nomCourt} dans ${rappel.dans} min`}
              </span>
              <span className="chiffre text-menu font-bold">
                {rappel.creneau.debut.replace(':', 'h')}–{rappel.creneau.fin.replace(':', 'h')} ·{' '}
                {rappel.creneau.salle ?? 'salle non indiquée'}
                {rappel.creneau.professeur ? ` · ${rappel.creneau.professeur}` : ''}
              </span>
              {rappel.enCours && cours ? (
                <span className="chiffre text-menu font-bold ml-auto">
                  {formatDuree(cours.restantMinutes)} restantes
                </span>
              ) : null}
            </button>
          ) : null}

          <div className="flex-1 flex gap-4 min-w-0">
            <main className="flex-1 min-w-0 flex flex-col">
              {vue === 'planning' ? (
                <div className="carte flex-1 p-4 sm:p-5 flex flex-col min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h2 className="anton text-[1.7rem] leading-none">
                      {vuePlanning === 'mois'
                        ? moisAffiche.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                        : `Semaine du ${maintenant.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                    </h2>

                    {vuePlanning === 'mois' ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDecalageMois((n) => n - 1)}
                          className="bouton bouton-plein pilule px-3"
                          aria-label="Mois précédent"
                        >
                          <IconeFleche />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecalageMois((n) => n + 1)}
                          className="bouton bouton-plein pilule px-3"
                          aria-label="Mois suivant"
                        >
                          <IconeFleche className="rotate-180" />
                        </button>
                        {decalageMois !== 0 ? (
                          <button type="button" onClick={() => setDecalageMois(0)} className="bouton">
                            Aujourd’hui
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="ml-auto flex gap-1 p-1 cellule">
                      {(['semaine', 'mois'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => definirVuePlanning(v)}
                          aria-pressed={vuePlanning === v}
                          className="onglet"
                        >
                          {v === 'semaine' ? 'Semaine' : 'Mois'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {vuePlanning === 'semaine' ? (
                    <Planning
                      creneaux={creneaux}
                      matieres={matieres}
                      jours={jours}
                      bornes={META_PLANNING.bornes}
                      amplitude={META_PLANNING.amplitude}
                      maintenant={maintenant}
                      semestre={semestre}
                      quinzaine={quinzaine}
                      onOuvrir={ouvrirCreneau}
                    />
                  ) : (
                    <VueMois
                      mois={moisAffiche}
                      creneaux={creneaux}
                      matieres={matieres}
                      devoirs={devoirsBruts}
                      maintenant={maintenant}
                      semestre={semestre}
                      quinzaine={quinzaine}
                      onOuvrir={ouvrirCreneau}
                    />
                  )}
                </div>
              ) : null}

              {vue === 'matieres' ? <VueMatieres matieres={matieres} onOuvrir={ouvrirMatiere} /> : null}
              {vue === 'devoirs' ? <VueDevoirs matieres={matieres} maintenant={maintenant} /> : null}
              {vue === 'notes' ? <VueNotes matieres={matieres} /> : null}
              {vue === 'outils' ? (
                <div className="carte flex-1 overflow-hidden">
                  <Outils />
                </div>
              ) : null}
              {vue === 'edition' ? (
                <div className="carte flex-1 overflow-auto">
                  <EditeurPlanning />
                </div>
              ) : null}
              {vue === 'reglages' ? (
                <VueReglages etatNotifications={etatNotifs} onActiverNotifications={() => void activerNotifications()} />
              ) : null}
            </main>

            {vue === 'planning' ? (
              <div className="hidden 2xl:block">
                <PanneauDroit
                  cours={aVenir}
                  devoirs={devoirs}
                  matieres={matieres}
                  chapitresFaits={chapitresFaits}
                  onOuvrir={ouvrirCreneau}
                  onOuvrirDevoirs={() => setVue('devoirs')}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {ouvert ? (
        <EcranMatiere
          creneau={ouvert.creneau}
          matiere={ouvert.matiere}
          matieres={matieres}
          maintenant={maintenant}
          onFermer={() => setOuvert(null)}
        />
      ) : null}
    </div>
  )
}

/** Les prochains cours, à partir de maintenant, sur les jours suivants. */
function prochainsCours(
  creneaux: Creneau[],
  maintenant: Date,
  semestre: 1 | 2,
  quinzaine: 'Q1' | 'Q2',
  combien: number,
): EntreeCours[] {
  const actifs = creneaux.filter((c) => creneauActif(c, semestre, quinzaine))
  const jourActuel = jourDeLaDate(maintenant)
  const m = minutesDeLaDate(maintenant)
  const depart = jourActuel ? JOURS.indexOf(jourActuel) : -1
  const sortie: EntreeCours[] = []

  for (let d = 0; d <= 7 && sortie.length < combien; d += 1) {
    const jour = JOURS[(depart + d + JOURS.length) % JOURS.length] as Jour
    const duJour = actifs
      .filter((c) => c.jour === jour)
      .sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut))
    for (const c of duJour) {
      const debut = enMinutes(c.debut)
      const fin = enMinutes(c.fin)
      const aujourdhui = d === 0 && jourActuel !== null
      if (aujourdhui && fin <= m) continue
      const enCours = aujourdhui && m >= debut && m < fin
      sortie.push({
        creneau: c,
        jour,
        dans: aujourdhui ? Math.max(0, debut - m) : null,
        enCours,
        avancement: enCours ? (m - debut) / (fin - debut) : 0,
      })
      if (sortie.length >= combien) break
    }
  }
  return sortie
}
