import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Creneau, Matiere } from '../../types'
import { useRegistre } from '../../store/useRegistre'
import { moyennePonderee, moyenneGenerale } from '../../lib/moyennes'
import { classerDevoirs } from '../../lib/selection'
import { formatDecimal } from '../../lib/compta'
import { enMinutes, formatDateCourte, formatDuree, isoAujourdhui, minutesDeLaDate } from '../../lib/temps'
import { useEnregistrementDiffere, useMouvementReduit } from '../../lib/hooks'
import { Champ, Section, Vide } from '../ui/primitives'

export function PanneauFiche({
  creneau,
  matiere,
  matieres,
  maintenant,
  onFermer,
}: {
  creneau: Creneau
  matiere: Matiere | undefined
  matieres: Matiere[]
  maintenant: Date
  onFermer: () => void
}) {
  const panneau = useRef<HTMLDivElement>(null)
  const mouvementReduit = useMouvementReduit()
  const [fermeture, setFermeture] = useState(false)

  const notes = useRegistre((s) => s.notes)
  const devoirs = useRegistre((s) => s.devoirs)
  const blocNotes = useRegistre((s) => s.blocNotes)
  const chapitresFaits = useRegistre((s) => s.chapitresFaits)
  const ajouterNote = useRegistre((s) => s.ajouterNote)
  const supprimerNote = useRegistre((s) => s.supprimerNote)
  const ajouterDevoir = useRegistre((s) => s.ajouterDevoir)
  const basculerDevoir = useRegistre((s) => s.basculerDevoir)
  const supprimerDevoir = useRegistre((s) => s.supprimerDevoir)
  const ecrireBlocNotes = useRegistre((s) => s.ecrireBlocNotes)
  const basculerChapitre = useRegistre((s) => s.basculerChapitre)
  const marquerRevision = useRegistre((s) => s.marquerRevision)

  const code = creneau.code
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

  const debut = enMinutes(creneau.debut)
  const fin = enMinutes(creneau.fin)
  const m = minutesDeLaDate(maintenant)
  const enCours = m >= debut && m < fin
  const restant = fin - m

  const chapitres = matiere?.chapitres ?? []
  const faits = chapitresFaits[code] ?? []

  // Ouverture : rotation Y + translation Z. Vraie profondeur, pas un slide.
  useLayoutEffect(() => {
    if (mouvementReduit || !panneau.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panneau.current,
        { rotateY: -13, z: -180, opacity: 0, transformOrigin: 'right center' },
        { rotateY: 0, z: 0, opacity: 1, duration: 0.48, ease: 'power3.out' },
      )
      if (!panneau.current?.querySelector('[data-fiche-section]')) return
      gsap.from('[data-fiche-section]', {
        opacity: 0,
        duration: 0.3,
        stagger: 0.045,
        delay: 0.1,
        ease: 'power2.out',
      })
    }, panneau)
    return () => ctx.revert()
  }, [creneau.id, mouvementReduit])

  const fermer = () => {
    if (mouvementReduit || !panneau.current) {
      onFermer()
      return
    }
    setFermeture(true)
    gsap.to(panneau.current, {
      rotateY: -13,
      z: -180,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: onFermer,
    })
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const premierChamp = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    premierChamp.current?.focus()
  }, [creneau.id])

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end scene-panneau"
      role="dialog"
      aria-modal="true"
      aria-label={`Fiche ${creneau.matiere}`}
    >
      <button
        type="button"
        aria-label="Fermer la fiche"
        onClick={fermer}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-encre)_38%,transparent)] cursor-default"
      />
      <div
        ref={panneau}
        className="panneau relative w-full sm:w-[min(560px,92vw)] h-full bg-papier-vif filet-l overflow-y-auto"
        style={{ pointerEvents: fermeture ? 'none' : undefined }}
      >
        <header className="sticky top-0 z-10 bg-papier-vif filet-b px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="folio">
                {creneau.code}
                {matiere?.epreuve ? ` · épreuve ${matiere.epreuve}` : ''}
              </p>
              <h2 className="text-titre mt-0.5 truncate">{creneau.matiere}</h2>
            </div>
            <button ref={premierChamp} type="button" onClick={fermer} className="bouton bouton-discret shrink-0">
              Fermer
              <span className="folio">Échap</span>
            </button>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 mt-3">
            <Donnee libelle="Horaire" valeur={`${creneau.debut.replace(':', 'h')} – ${creneau.fin.replace(':', 'h')}`} />
            <Donnee libelle="Salle" valeur={creneau.salle ?? 'non indiquée'} />
            <Donnee libelle="Professeur" valeur={creneau.professeur ?? '—'} />
            <Donnee libelle="Groupe" valeur={creneau.groupe ?? 'classe entière'} />
          </dl>

          {enCours ? (
            <p className="mt-2.5 text-menu font-semibold text-debit">
              En cours — il reste <span className="chiffre">{formatDuree(restant)}</span>
            </p>
          ) : null}
        </header>

        <div className="px-5 py-4 space-y-7">
          <div data-fiche-section>
            {matiere?.notionUrl ? (
              <a
                href={matiere.notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => marquerRevision(code)}
                className="bouton bouton-plein w-full justify-center py-3 text-[0.95rem]"
              >
                Ouvrir la fiche Notion
              </a>
            ) : (
              <div className="filet border p-3">
                <p className="text-menu font-semibold">Aucune fiche Notion liée pour {creneau.code}.</p>
                <p className="text-folio text-encre-clair mt-1">
                  Lance <span className="chiffre">npm run notion:sync</span> pour créer la page et
                  renseigner son URL dans <span className="chiffre">src/data/matieres.json</span>.
                </p>
              </div>
            )}
            {matiere ? (
              <p className="text-folio text-encre-clair mt-2">{matiere.objectif}</p>
            ) : null}
          </div>

          <Section
            folio="01"
            titre="Mes notes"
            aside={
              moyenne.valeur !== null ? (
                <span className="chiffre">
                  {formatDecimal(moyenne.valeur)}/20 · {moyenne.nombreNotes} note
                  {moyenne.nombreNotes > 1 ? 's' : ''}
                </span>
              ) : null
            }
          >
            <div data-fiche-section>
              {moyenne.valeur !== null ? (
                <div className="flex items-baseline gap-5 mb-3 filet-b pb-2">
                  <div>
                    <span className="chiffre text-[2rem] leading-none">{formatDecimal(moyenne.valeur)}</span>
                    <span className="folio ml-1">/20</span>
                  </div>
                  {ecart !== null ? (
                    <p className="text-folio">
                      <span className={ecart >= 0 ? 'sens-credit' : 'sens-debit'}>
                        {ecart >= 0 ? '+' : ''}
                        <span className="chiffre">{formatDecimal(ecart)}</span>
                      </span>{' '}
                      par rapport à ta moyenne générale (
                      <span className="chiffre">{formatDecimal(generale.valeur ?? NaN)}</span>)
                    </p>
                  ) : null}
                </div>
              ) : null}

              {sesNotes.length ? (
                <table className="listing w-full text-menu mb-3">
                  <thead>
                    <tr>
                      <th>Évaluation</th>
                      <th className="text-right">Note</th>
                      <th className="text-right">Coef.</th>
                      <th className="text-right">Date</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {sesNotes.map((n) => (
                      <tr key={n.id}>
                        <td>{n.intitule || '—'}</td>
                        <td className="num">
                          {n.valeur}
                          <span className="text-folio">/{n.bareme}</span>
                        </td>
                        <td className="num">{n.coefficient}</td>
                        <td className="num text-folio">{formatDateCourte(n.date)}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => supprimerNote(n.id)}
                            className="folio lien-souligne hover:text-debit"
                            aria-label={`Supprimer la note ${n.intitule}`}
                          >
                            suppr.
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <Vide>Aucune note enregistrée dans cette matière.</Vide>
              )}

              <FormulaireNote code={code} onAjouter={ajouterNote} />
            </div>
          </Section>

          <Section
            folio="02"
            titre="Devoirs à faire"
            aside={
              sesDevoirs.some((d) => d.enRetard) ? (
                <span className="text-debit font-bold">
                  {sesDevoirs.filter((d) => d.enRetard).length} en retard
                </span>
              ) : null
            }
          >
            <div data-fiche-section>
              {sesDevoirs.length ? (
                <ul className="mb-3">
                  {sesDevoirs.map((d) => (
                    <li
                      key={d.id}
                      className={`flex items-baseline gap-2.5 py-1.5 filet-b ${d.enRetard ? 'alerte-retard pl-2' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={d.fait}
                        onChange={() => basculerDevoir(d.id)}
                        id={`dev-${d.id}`}
                        className="accent-[var(--color-encre)] mt-0.5"
                      />
                      <label
                        htmlFor={`dev-${d.id}`}
                        className={`flex-1 text-menu ${d.fait ? 'line-through opacity-55' : ''}`}
                      >
                        {d.intitule}
                      </label>
                      <span
                        className={`chiffre text-folio ${d.enRetard ? 'text-debit font-bold' : 'text-encre-clair'}`}
                      >
                        {formatDateCourte(d.echeance)}
                        {d.enRetard ? ` · ${Math.abs(d.joursRestants)} j de retard` : ''}
                        {d.pourAujourdhui ? " · aujourd'hui" : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => supprimerDevoir(d.id)}
                        className="folio lien-souligne hover:text-debit"
                        aria-label={`Supprimer le devoir ${d.intitule}`}
                      >
                        suppr.
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vide>Rien à rendre dans cette matière.</Vide>
              )}
              <FormulaireDevoir code={code} onAjouter={ajouterDevoir} />
            </div>
          </Section>

          <Section
            folio="03"
            titre="Progression"
            aside={
              chapitres.length ? (
                <span className="chiffre">
                  {faits.length}/{chapitres.length} chapitres
                </span>
              ) : null
            }
          >
            <div data-fiche-section>
              {chapitres.length ? (
                <>
                  <div className="h-[3px] bg-[color-mix(in_srgb,var(--color-filet)_70%,transparent)] mb-3">
                    <div
                      className="h-full bg-credit transition-[width] duration-300"
                      style={{ width: `${(faits.length / chapitres.length) * 100}%` }}
                    />
                  </div>
                  <ul>
                    {chapitres.map((ch) => (
                      <li key={ch} className="flex items-baseline gap-2.5 py-1 filet-b">
                        <input
                          type="checkbox"
                          id={`ch-${code}-${ch}`}
                          checked={faits.includes(ch)}
                          onChange={() => basculerChapitre(code, ch)}
                          className="accent-[var(--color-credit)]"
                        />
                        <label
                          htmlFor={`ch-${code}-${ch}`}
                          className={`text-menu ${faits.includes(ch) ? 'opacity-55' : ''}`}
                        >
                          {ch}
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Vide>Aucun chapitre déclaré pour cette matière.</Vide>
              )}
            </div>
          </Section>

          <Section folio="04" titre="Bloc-notes">
            <div data-fiche-section>
              <BlocNotes
                valeur={blocNotes[code] ?? ''}
                onEnregistrer={(v) => ecrireBlocNotes(code, v)}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Donnee({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="folio">{libelle}</dt>
      <dd className="text-menu font-semibold chiffre">{valeur}</dd>
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
          valeur: Number(valeur),
          bareme: Number(bareme),
          coefficient: Number(coefficient),
          date,
        })
        setIntitule('')
        setValeur('')
        setCoefficient('1')
      }}
      className="grid grid-cols-2 sm:grid-cols-6 gap-x-3 gap-y-2 items-end"
    >
      <div className="col-span-2">
        <Champ
          etiquette="Intitulé"
          value={intitule}
          onChange={(e) => setIntitule(e.target.value)}
          placeholder="Devoir surveillé n° 2"
        />
      </div>
      <Champ etiquette="Note" chiffre inputMode="decimal" value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder="14,5" />
      <Champ etiquette="Sur" chiffre inputMode="decimal" value={bareme} onChange={(e) => setBareme(e.target.value)} />
      <Champ etiquette="Coef." chiffre inputMode="decimal" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} />
      <Champ etiquette="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
      className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 items-end"
    >
      <div className="col-span-2">
        <Champ
          etiquette="À faire"
          value={intitule}
          onChange={(e) => setIntitule(e.target.value)}
          placeholder="Exercices 12 à 15 p. 84"
        />
      </div>
      <Champ etiquette="Pour le" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
      <button type="submit" className="bouton" disabled={!intitule.trim()}>
        Ajouter
      </button>
    </form>
  )
}

function BlocNotes({
  valeur,
  onEnregistrer,
}: {
  valeur: string
  onEnregistrer: (v: string) => void
}) {
  const [texte, setTexte] = useState(valeur)
  useEffect(() => setTexte(valeur), [valeur])
  const etat = useEnregistrementDiffere(texte, onEnregistrer)
  return (
    <div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={7}
        placeholder="Ce que le prof a insisté, les pièges, les pages à relire…"
        className="w-full bg-transparent p-2 filet border resize-y leading-[1.9]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0 calc(1.9em - 1px), color-mix(in srgb, var(--color-filet) 55%, transparent) calc(1.9em - 1px) 1.9em)',
        }}
      />
      <p className="folio mt-1 h-4" aria-live="polite">
        {etat === 'en-cours' ? 'enregistrement…' : etat === 'enregistre' ? 'enregistré' : ''}
      </p>
    </div>
  )
}
