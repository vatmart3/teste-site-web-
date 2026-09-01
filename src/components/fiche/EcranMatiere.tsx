import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Creneau, Matiere } from '../../types'
import { useRegistre } from '../../store/useRegistre'
import { moyennePonderee, moyenneGenerale } from '../../lib/moyennes'
import { classerDevoirs } from '../../lib/selection'
import { enMinutes, formatDateCourte, formatDuree, isoAujourdhui, minutesDeLaDate } from '../../lib/temps'
import { useEnregistrementDiffere, useMouvementReduit } from '../../lib/hooks'
import { formatDecimal } from '../../lib/compta'
import {
  blocsDuMiroir,
  lirePageNotion,
  messageErreurNotion,
  type BlocNotion,
  type CodeErreurNotion,
} from '../../lib/notion'

type Onglet = 'cours' | 'notes' | 'devoirs'

export function EcranMatiere({
  creneau,
  matiere,
  matieres,
  maintenant,
  onFermer,
}: {
  creneau: Creneau
  matiere: Matiere
  matieres: Matiere[]
  maintenant: Date
  onFermer: () => void
}) {
  const ecran = useRef<HTMLDivElement>(null)
  const mouvementReduit = useMouvementReduit()
  const [onglet, setOnglet] = useState<Onglet>('cours')

  const notes = useRegistre((s) => s.notes)
  const devoirs = useRegistre((s) => s.devoirs)
  const blocNotes = useRegistre((s) => s.blocNotes)
  const chapitresFaits = useRegistre((s) => s.chapitresFaits)
  const seances = useRegistre((s) => s.seances)
  const ajouterNote = useRegistre((s) => s.ajouterNote)
  const supprimerNote = useRegistre((s) => s.supprimerNote)
  const ajouterDevoir = useRegistre((s) => s.ajouterDevoir)
  const basculerDevoir = useRegistre((s) => s.basculerDevoir)
  const supprimerDevoir = useRegistre((s) => s.supprimerDevoir)
  const ecrireBlocNotes = useRegistre((s) => s.ecrireBlocNotes)
  const basculerChapitre = useRegistre((s) => s.basculerChapitre)
  const marquerRevision = useRegistre((s) => s.marquerRevision)
  const enregistrerSeance = useRegistre((s) => s.enregistrerSeance)

  const code = matiere.code
  const couleur = matiere.couleur

  const sesNotes = useMemo(() => notes.filter((n) => n.code === code), [notes, code])
  const moyenne = moyennePonderee(sesNotes)
  const coefficients = useMemo(
    () => Object.fromEntries(matieres.map((m) => [m.code, m.coefficient])),
    [matieres],
  )
  const generale = moyenneGenerale(notes, coefficients)
  const ecart =
    moyenne.valeur !== null && generale.valeur !== null
      ? Math.round((moyenne.valeur - generale.valeur) * 100) / 100
      : null

  const sesDevoirs = useMemo(
    () => classerDevoirs(devoirs, maintenant).filter((d) => d.code === code),
    [devoirs, code, maintenant],
  )
  const faits = chapitresFaits[code] ?? []
  const minutesTravaillees = useMemo(
    () => seances.filter((s) => s.code === code).reduce((t, s) => t + s.duree, 0),
    [seances, code],
  )

  const debut = enMinutes(creneau.debut)
  const fin = enMinutes(creneau.fin)
  const m = minutesDeLaDate(maintenant)
  const enCours = m >= debut && m < fin

  // ── Séance chronométrée ───────────────────────────────────────────────────
  const [demarreeA, setDemarreeA] = useState<number | null>(null)
  const [ecoule, setEcoule] = useState(0)
  useEffect(() => {
    if (demarreeA === null) return
    const i = window.setInterval(() => setEcoule(Math.floor((Date.now() - demarreeA) / 1000)), 1000)
    return () => window.clearInterval(i)
  }, [demarreeA])

  const commencer = () => {
    setDemarreeA(Date.now())
    setEcoule(0)
    marquerRevision(code)
  }
  const terminer = () => {
    if (demarreeA === null) return
    enregistrerSeance(code, new Date(demarreeA).toISOString(), Math.round(ecoule / 60))
    setDemarreeA(null)
    setEcoule(0)
  }

  // ── Contenu Notion : miroir local, puis lecture en direct si possible ─────
  const miroir = useMemo(() => blocsDuMiroir(matiere), [matiere])
  const [blocs, setBlocs] = useState<BlocNotion[]>(miroir)
  const [sourceNotion, setSourceNotion] = useState<'miroir' | 'direct' | 'chargement'>('chargement')
  const [erreurNotion, setErreurNotion] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    setBlocs(miroir)
    setSourceNotion('chargement')
    setErreurNotion(null)
    if (!matiere.notionPageId) {
      setSourceNotion('miroir')
      return
    }
    lirePageNotion(matiere.notionPageId)
      .then((r) => {
        if (annule) return
        setBlocs(r.blocs)
        setSourceNotion('direct')
      })
      .catch((e: { code?: CodeErreurNotion }) => {
        if (annule) return
        setSourceNotion('miroir')
        if (e?.code && e.code !== 'indisponible') setErreurNotion(messageErreurNotion(e.code))
      })
    return () => {
      annule = true
    }
  }, [matiere.notionPageId, miroir])

  // ── Ouverture : le panneau monte depuis le bas, en profondeur ─────────────
  useLayoutEffect(() => {
    if (mouvementReduit || !ecran.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ecran.current,
        { yPercent: 6, rotateX: 7, opacity: 0, transformOrigin: 'center bottom' },
        { yPercent: 0, rotateX: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
      )
      gsap.from('[data-entree]', { opacity: 0, y: 12, duration: 0.35, stagger: 0.05, delay: 0.12 })
    }, ecran)
    return () => ctx.revert()
  }, [creneau.id, mouvementReduit])

  const fermer = () => {
    if (demarreeA !== null) terminer()
    if (mouvementReduit || !ecran.current) {
      onFermer()
      return
    }
    gsap.to(ecran.current, {
      yPercent: 5,
      opacity: 0,
      duration: 0.26,
      ease: 'power2.in',
      onComplete: onFermer,
    })
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer()
    }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demarreeA])

  const chrono = `${String(Math.floor(ecoule / 3600)).padStart(2, '0')}:${String(
    Math.floor((ecoule % 3600) / 60),
  ).padStart(2, '0')}:${String(ecoule % 60).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 scene-matiere bg-papier" role="dialog" aria-modal="true" aria-label={matiere.nom}>
      <div ref={ecran} className="ecran-matiere h-full flex flex-col overflow-hidden">
        {/* Bandeau titre, dans la couleur de la matière */}
        <header
          className="shrink-0 px-4 sm:px-8 pt-5 pb-4"
          style={{ background: `linear-gradient(180deg, ${couleur}22 0%, transparent 100%)` }}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="folio flex items-center gap-2 flex-wrap">
                <span aria-hidden="true">{matiere.icone}</span>
                <span>{matiere.code}</span>
                {matiere.epreuves.length ? <span>· {matiere.epreuves.join(' + ')} · coef. {matiere.coefficient}</span> : null}
                <span>· {creneau.debut.replace(':', 'h')}–{creneau.fin.replace(':', 'h')}</span>
                <span>· {creneau.salle ?? 'salle non indiquée'}</span>
                {creneau.professeur ? <span>· {creneau.professeur}</span> : null}
              </p>
              <h2
                className="anton mt-1 text-[clamp(1.9rem,6vw,4.2rem)] leading-[0.9]"
                style={{ color: couleur }}
              >
                {matiere.nom}
              </h2>
            </div>
            <button type="button" onClick={fermer} className="bouton bouton-discret shrink-0">
              Fermer <span className="folio">Échap</span>
            </button>
          </div>

          {/* Chrono de séance */}
          <div className="mt-4 flex flex-wrap items-center gap-4" data-entree>
            {demarreeA === null ? (
              <button
                type="button"
                onClick={commencer}
                className="anton text-[1.05rem] px-6 py-3 transition-transform hover:scale-[1.03] active:scale-100"
                style={{ background: couleur, color: '#0A0B0D' }}
              >
                Commencer {matiere.nomCourt}
              </button>
            ) : (
              <>
                <span className="chiffre text-[clamp(1.8rem,4vw,2.6rem)] leading-none" style={{ color: couleur }}>
                  {chrono}
                </span>
                <button type="button" onClick={terminer} className="bouton bouton-plein">
                  Terminer la séance
                </button>
              </>
            )}
            <p className="folio">
              {minutesTravaillees > 0 ? `${formatDuree(minutesTravaillees)} déjà travaillées` : 'aucune séance enregistrée'}
              {enCours ? ' · cours en ce moment' : ''}
            </p>
            {matiere.notionUrl ? (
              <a
                href={matiere.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bouton bouton-discret ml-auto"
              >
                Ouvrir dans Notion
              </a>
            ) : null}
          </div>
        </header>

        {/* Onglets */}
        <div className="shrink-0 flex filet-b px-4 sm:px-8" role="tablist" aria-label="Sections de la matière">
          {(
            [
              ['cours', 'Cours'],
              ['notes', `Notes${moyenne.valeur !== null ? ` · ${formatDecimal(moyenne.valeur)}` : ''}`],
              ['devoirs', `Devoirs${sesDevoirs.filter((d) => !d.fait).length ? ` · ${sesDevoirs.filter((d) => !d.fait).length}` : ''}`],
            ] as [Onglet, string][]
          ).map(([id, libelle]) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={onglet === id}
              onClick={() => setOnglet(id)}
              className="onglet"
            >
              {libelle}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {onglet === 'cours' ? (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-10 max-w-[100rem]" data-entree>
              <div className="min-w-0">
                <p className="folio mb-4">
                  {sourceNotion === 'direct'
                    ? 'Contenu lu en direct dans ton Notion.'
                    : sourceNotion === 'chargement'
                      ? 'Lecture de Notion…'
                      : 'Copie locale de ta page Notion.'}
                  {erreurNotion ? ` — ${erreurNotion}` : ''}
                </p>
                <RenduNotion
                  blocs={blocs}
                  couleur={couleur}
                  chapitresFaits={faits}
                  onBasculerChapitre={(c) => basculerChapitre(code, c)}
                />
              </div>

              <aside className="lg:sticky lg:top-0 self-start space-y-6">
                <div>
                  <p className="etiquette">Progression</p>
                  <p className="chiffre text-[2rem] leading-none" style={{ color: couleur }}>
                    {faits.length}
                    <span className="text-encre-clair text-[1rem]">/{matiere.chapitres.length}</span>
                  </p>
                  <div className="h-[3px] mt-2 bg-[var(--color-filet)]">
                    <div
                      className="h-full transition-[width] duration-300"
                      style={{
                        width: `${matiere.chapitres.length ? (faits.length / matiere.chapitres.length) * 100 : 0}%`,
                        background: couleur,
                      }}
                    />
                  </div>
                  <p className="folio mt-1.5">chapitres cochés</p>
                </div>

                <div>
                  <p className="etiquette">Bloc-notes</p>
                  <BlocNotes valeur={blocNotes[code] ?? ''} onEnregistrer={(v) => ecrireBlocNotes(code, v)} couleur={couleur} />
                </div>
              </aside>
            </div>
          ) : null}

          {onglet === 'notes' ? (
            <div className="max-w-[72ch]" data-entree>
              {moyenne.valeur !== null ? (
                <div className="flex items-baseline gap-6 mb-5 filet-b pb-3">
                  <span className="chiffre text-[2.6rem] leading-none" style={{ color: couleur }}>
                    {formatDecimal(moyenne.valeur)}
                  </span>
                  <span className="folio">/20 · {moyenne.nombreNotes} note{moyenne.nombreNotes > 1 ? 's' : ''}</span>
                  {ecart !== null ? (
                    <span className={`folio ${ecart >= 0 ? 'sens-credit' : 'sens-debit'}`}>
                      {ecart >= 0 ? '+' : ''}
                      {formatDecimal(ecart)} vs moyenne générale ({formatDecimal(generale.valeur ?? NaN)})
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="folio mb-4">Aucune note dans cette matière.</p>
              )}

              {sesNotes.length ? (
                <table className="listing w-full text-menu mb-5">
                  <thead>
                    <tr>
                      <th>Évaluation</th>
                      <th className="text-right">Note</th>
                      <th className="text-right">Coef.</th>
                      <th className="text-right">Date</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sesNotes.map((n) => (
                      <tr key={n.id}>
                        <td>{n.intitule}</td>
                        <td className="num">{formatDecimal(n.valeur)}<span className="text-folio">/{n.bareme}</span></td>
                        <td className="num">{n.coefficient}</td>
                        <td className="num text-folio">{formatDateCourte(n.date)}</td>
                        <td className="text-right">
                          <button type="button" onClick={() => supprimerNote(n.id)} className="folio lien-souligne hover:text-debit" aria-label={`Supprimer ${n.intitule}`}>
                            suppr.
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              <FormulaireNote code={code} onAjouter={ajouterNote} />
            </div>
          ) : null}

          {onglet === 'devoirs' ? (
            <div className="max-w-[72ch]" data-entree>
              {sesDevoirs.length ? (
                <ul className="mb-5">
                  {sesDevoirs.map((d) => (
                    <li key={d.id} className={`flex items-baseline gap-3 py-2 filet-b ${d.enRetard ? 'alerte-retard pl-2' : ''}`}>
                      <input
                        type="checkbox"
                        checked={d.fait}
                        onChange={() => basculerDevoir(d.id)}
                        id={`dev-${d.id}`}
                        style={{ accentColor: couleur }}
                      />
                      <label htmlFor={`dev-${d.id}`} className={`flex-1 ${d.fait ? 'line-through opacity-50' : ''}`}>
                        {d.intitule}
                      </label>
                      <span className={`chiffre text-folio ${d.enRetard ? 'text-debit' : ''}`}>
                        {formatDateCourte(d.echeance)}
                        {d.enRetard ? ` · ${Math.abs(d.joursRestants)} j de retard` : d.pourAujourdhui ? " · aujourd'hui" : ''}
                      </span>
                      <button type="button" onClick={() => supprimerDevoir(d.id)} className="folio lien-souligne hover:text-debit" aria-label={`Supprimer ${d.intitule}`}>
                        suppr.
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="folio mb-4">Rien à rendre dans cette matière.</p>
              )}
              <FormulaireDevoir code={code} onAjouter={ajouterDevoir} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function RenduNotion({
  blocs,
  couleur,
  chapitresFaits,
  onBasculerChapitre,
}: {
  blocs: BlocNotion[]
  couleur: string
  chapitresFaits: string[]
  onBasculerChapitre: (chapitre: string) => void
}) {
  return (
    <div className="space-y-1">
      {blocs.map((b, i) => {
        if (b.t === 'titre') {
          return (
            <h3 key={i} className="anton text-[1.35rem] mt-7 mb-2" style={{ color: couleur }}>
              {b.texte}
            </h3>
          )
        }
        if (b.t === 'callout') {
          const bord = b.ton === 'alerte' ? 'var(--color-debit)' : b.ton === 'note' ? 'var(--color-or)' : couleur
          return (
            <p
              key={i}
              className="pl-3 py-2 my-3 leading-relaxed"
              style={{ borderLeft: `3px solid ${bord}`, background: `${bord}14` }}
            >
              {b.icone ? <span className="mr-2" aria-hidden="true">{b.icone}</span> : null}
              {b.texte}
            </p>
          )
        }
        if (b.t === 'toggle') {
          const fait = chapitresFaits.includes(b.texte)
          return (
            <label key={i} className="flex items-center gap-3 py-1.5 filet-b cursor-pointer">
              <input
                type="checkbox"
                checked={fait}
                onChange={() => onBasculerChapitre(b.texte)}
                style={{ accentColor: couleur }}
              />
              <span className={fait ? 'opacity-45 line-through' : ''}>{b.texte}</span>
            </label>
          )
        }
        if (b.t === 'todo') {
          return (
            <p key={i} className="flex items-baseline gap-3 py-1">
              <span className="chiffre text-folio">{b.fait ? '☑' : '☐'}</span>
              <span>{b.texte}</span>
            </p>
          )
        }
        if (b.t === 'liste') {
          return (
            <p key={i} className="flex items-baseline gap-3 py-1">
              <span style={{ color: couleur }}>—</span>
              <span>{b.texte}</span>
            </p>
          )
        }
        if (b.t === 'table') {
          const [entetes, ...lignes] = b.lignes
          return (
            <div key={i} className="overflow-x-auto my-3">
              <table className="listing w-full text-menu min-w-[28rem]">
                <thead>
                  <tr>
                    {entetes.map((e, j) => (
                      <th key={j} className={j > 0 ? 'text-right' : ''}>
                        {e}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, j) => (
                    <tr key={j}>
                      {l.map((c, k) => (
                        <td key={k} className={k > 0 ? `num ${k === 1 ? 'sens-debit' : 'sens-credit'}` : ''}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        return (
          <p key={i} className="leading-relaxed py-1">
            {b.texte}
          </p>
        )
      })}
    </div>
  )
}

function FormulaireNote({
  code,
  onAjouter,
}: {
  code: string
  onAjouter: (n: { code: string; intitule: string; valeur: number; bareme: number; coefficient: number; date: string }) => void
}) {
  const [intitule, setIntitule] = useState('')
  const [valeur, setValeur] = useState('')
  const [bareme, setBareme] = useState('20')
  const [coefficient, setCoefficient] = useState('1')
  const [date, setDate] = useState(isoAujourdhui())
  const valide = valeur !== '' && Number(bareme) > 0 && Number(coefficient) > 0
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!valide) return
        onAjouter({
          code,
          intitule: intitule.trim() || 'Évaluation',
          valeur: Number(valeur.replace(',', '.')),
          bareme: Number(bareme.replace(',', '.')),
          coefficient: Number(coefficient.replace(',', '.')),
          date,
        })
        setIntitule('')
        setValeur('')
        setCoefficient('1')
      }}
      className="grid grid-cols-2 sm:grid-cols-6 gap-x-4 gap-y-3 items-end"
    >
      <label className="col-span-2 block">
        <span className="etiquette">Intitulé</span>
        <input value={intitule} onChange={(e) => setIntitule(e.target.value)} className="champ" placeholder="Devoir surveillé n° 2" />
      </label>
      <label className="block">
        <span className="etiquette">Note</span>
        <input inputMode="decimal" value={valeur} onChange={(e) => setValeur(e.target.value)} className="champ champ-chiffre" placeholder="14,5" />
      </label>
      <label className="block">
        <span className="etiquette">Sur</span>
        <input inputMode="decimal" value={bareme} onChange={(e) => setBareme(e.target.value)} className="champ champ-chiffre" />
      </label>
      <label className="block">
        <span className="etiquette">Coef.</span>
        <input inputMode="decimal" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} className="champ champ-chiffre" />
      </label>
      <label className="block">
        <span className="etiquette">Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="champ" />
      </label>
      <div className="col-span-2 sm:col-span-6">
        <button type="submit" className="bouton" disabled={!valide}>
          Enregistrer la note
        </button>
      </div>
    </form>
  )
}

function FormulaireDevoir({
  code,
  onAjouter,
}: {
  code: string
  onAjouter: (d: { code: string; intitule: string; echeance: string }) => void
}) {
  const [intitule, setIntitule] = useState('')
  const [echeance, setEcheance] = useState(isoAujourdhui())
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!intitule.trim()) return
        onAjouter({ code, intitule: intitule.trim(), echeance })
        setIntitule('')
      }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 items-end"
    >
      <label className="col-span-2 block">
        <span className="etiquette">À faire</span>
        <input value={intitule} onChange={(e) => setIntitule(e.target.value)} className="champ" placeholder="Exercices 12 à 15 p. 84" />
      </label>
      <label className="block">
        <span className="etiquette">Pour le</span>
        <input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} className="champ" />
      </label>
      <button type="submit" className="bouton" disabled={!intitule.trim()}>
        Ajouter
      </button>
    </form>
  )
}

function BlocNotes({
  valeur,
  onEnregistrer,
  couleur,
}: {
  valeur: string
  onEnregistrer: (v: string) => void
  couleur: string
}) {
  const [texte, setTexte] = useState(valeur)
  useEffect(() => setTexte(valeur), [valeur])
  const etat = useEnregistrementDiffere(texte, onEnregistrer)
  return (
    <div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={6}
        placeholder="Ce que le prof a insisté, les pièges, les pages à relire…"
        className="w-full bg-[var(--color-papier-vif)] p-3 resize-y leading-relaxed border"
        style={{ borderColor: `${couleur}55` }}
      />
      <p className="folio mt-1 h-4" aria-live="polite">
        {etat === 'en-cours' ? 'enregistrement…' : etat === 'enregistre' ? 'enregistré' : ''}
      </p>
    </div>
  )
}
