import { useMemo, useState } from 'react'
import type { Matiere } from '../../types'
import { useRegistre } from '../../store/useRegistre'
import { classerDevoirs } from '../../lib/selection'
import { moyenneGenerale, moyennePonderee, mention } from '../../lib/moyennes'
import { formatDateCourte, formatDuree, isoAujourdhui } from '../../lib/temps'
import { formatDecimal } from '../../lib/compta'
import { estAppleMobile, lienNotion, libelleOuverture } from '../../lib/liens'
import { IconeLien } from '../shell/Icones'

// ── Matières ────────────────────────────────────────────────────────────────

export function VueMatieres({
  matieres,
  onOuvrir,
}: {
  matieres: Matiere[]
  onOuvrir: (code: string) => void
}) {
  const chapitresFaits = useRegistre((s) => s.chapitresFaits)
  const seances = useRegistre((s) => s.seances)
  const notes = useRegistre((s) => s.notes)
  const notionDansSafari = useRegistre((s) => s.notionDansSafari)

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {matieres.map((m, i) => {
        const faits = (chapitresFaits[m.code] ?? []).length
        const total = m.chapitres.length
        const minutes = seances.filter((s) => s.code === m.code).reduce((t, s) => t + s.duree, 0)
        const moy = moyennePonderee(notes.filter((n) => n.code === m.code)).valeur
        const lien = lienNotion(m.notionUrl, notionDansSafari)
        return (
          <article
            key={m.code}
            className="carte p-5 flex flex-col gap-3 entree-monter"
            style={{ ['--i' as string]: i, borderTop: `3px solid ${m.couleur}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="folio">
                  {m.code}
                  {m.epreuves.length ? ` · ${m.epreuves.join(' + ')} · coef. ${m.coefficient}` : ' · sans épreuve'}
                </p>
                <h3 className="anton text-[1.3rem] mt-1" style={{ color: m.couleur }}>
                  {m.nom}
                </h3>
              </div>
              <span className="text-[1.4rem] shrink-0" aria-hidden="true">
                {m.icone}
              </span>
            </div>

            <p className="folio leading-relaxed">{m.objectif}</p>

            <div className="mt-auto">
              <div className="flex items-baseline justify-between gap-3">
                <span className="folio">Progression</span>
                <span className="chiffre text-menu font-bold">
                  {faits}/{total}
                </span>
              </div>
              <div className="jauge mt-1.5">
                <span style={{ width: `${total ? (faits / total) * 100 : 0}%`, background: m.couleur }} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 folio">
              <span>{m.professeur ?? 'professeur à venir'}</span>
              {minutes ? <span className="chiffre">{formatDuree(minutes)} travaillées</span> : null}
              {moy !== null ? <span className="chiffre">moyenne {formatDecimal(moy)}</span> : null}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => onOuvrir(m.code)} className="bouton flex-1 justify-center">
                Ouvrir
              </button>
              {lien ? (
                <a
                  href={lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bouton"
                  title={libelleOuverture(notionDansSafari)}
                  aria-label={`${libelleOuverture(notionDansSafari)} — ${m.nom}`}
                >
                  <IconeLien />
                </a>
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

// ── Devoirs ─────────────────────────────────────────────────────────────────

export function VueDevoirs({
  matieres,
  maintenant,
}: {
  matieres: Matiere[]
  maintenant: Date
}) {
  const devoirsBruts = useRegistre((s) => s.devoirs)
  const ajouter = useRegistre((s) => s.ajouterDevoir)
  const basculer = useRegistre((s) => s.basculerDevoir)
  const supprimer = useRegistre((s) => s.supprimerDevoir)

  const [intitule, setIntitule] = useState('')
  const [code, setCode] = useState(matieres[0]?.code ?? 'P1')
  const [echeance, setEcheance] = useState(isoAujourdhui())

  const devoirs = useMemo(() => classerDevoirs(devoirsBruts, maintenant), [devoirsBruts, maintenant])
  const parCode = Object.fromEntries(matieres.map((m) => [m.code, m]))

  const groupes: [string, typeof devoirs][] = [
    ['En retard', devoirs.filter((d) => d.enRetard)],
    ['À venir', devoirs.filter((d) => !d.fait && !d.enRetard)],
    ['Faits', devoirs.filter((d) => d.fait)],
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
      <div className="carte p-5">
        {groupes.map(([titre, liste]) =>
          liste.length ? (
            <section key={titre} className="mb-6 last:mb-0">
              <h3 className="text-menu font-extrabold uppercase tracking-[0.06em] mb-2 text-encre-clair">
                {titre} <span className="chiffre">({liste.length})</span>
              </h3>
              <ul>
                {liste.map((d) => {
                  const m = parCode[d.code]
                  return (
                    <li
                      key={d.id}
                      className={`flex items-center gap-3 py-2.5 filet-b last:border-0 ${
                        d.enRetard ? 'alerte-retard px-3' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={d.fait}
                        onChange={() => basculer(d.id)}
                        id={`dv-${d.id}`}
                        style={{ accentColor: m?.couleur ?? 'var(--color-accent)' }}
                      />
                      <label htmlFor={`dv-${d.id}`} className={`flex-1 min-w-0 ${d.fait ? 'line-through opacity-50' : ''}`}>
                        <span className="block text-menu font-semibold truncate">{d.intitule}</span>
                        <span className="folio" style={{ color: m?.couleur }}>
                          {m?.nomCourt ?? d.code}
                        </span>
                      </label>
                      <span className={`chiffre folio shrink-0 ${d.enRetard ? 'text-debit font-bold' : ''}`}>
                        {formatDateCourte(d.echeance)}
                        {d.enRetard ? ` · ${Math.abs(d.joursRestants)} j` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => supprimer(d.id)}
                        className="folio lien-souligne hover:text-debit shrink-0"
                        aria-label={`Supprimer ${d.intitule}`}
                      >
                        suppr.
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null,
        )}
        {!devoirs.length ? <p className="folio py-4">Aucun devoir enregistré.</p> : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!intitule.trim()) return
          ajouter({ code, intitule: intitule.trim(), echeance })
          setIntitule('')
        }}
        className="carte p-5 flex flex-col gap-4"
      >
        <h3 className="text-intitule font-extrabold">Ajouter un devoir</h3>
        <label className="block">
          <span className="etiquette">À faire</span>
          <input value={intitule} onChange={(e) => setIntitule(e.target.value)} className="champ" placeholder="Exercices 12 à 15 p. 84" />
        </label>
        <label className="block">
          <span className="etiquette">Matière</span>
          <select value={code} onChange={(e) => setCode(e.target.value)} className="champ">
            {matieres.map((m) => (
              <option key={m.code} value={m.code}>
                {m.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="etiquette">Pour le</span>
          <input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} className="champ" />
        </label>
        <button type="submit" className="bouton bouton-plein justify-center" disabled={!intitule.trim()}>
          Ajouter
        </button>
      </form>
    </div>
  )
}

// ── Notes ───────────────────────────────────────────────────────────────────

export function VueNotes({ matieres }: { matieres: Matiere[] }) {
  const notes = useRegistre((s) => s.notes)
  const supprimer = useRegistre((s) => s.supprimerNote)

  const coefficients = useMemo(
    () => Object.fromEntries(matieres.map((m) => [m.code, m.coefficient])),
    [matieres],
  )
  const generale = moyenneGenerale(notes, coefficients)
  const mentionObtenue = mention(generale.valeur)

  const parMatiere = matieres
    .map((m) => ({ m, moyenne: moyennePonderee(notes.filter((n) => n.code === m.code)) }))
    .filter((x) => x.moyenne.valeur !== null)
    .sort((a, b) => (b.moyenne.valeur ?? 0) - (a.moyenne.valeur ?? 0))

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] items-start">
      <div className="carte p-5">
        <p className="etiquette">Moyenne générale</p>
        <p className="anton text-[3.4rem] leading-none" style={{ color: 'var(--color-accent-vif)' }}>
          {generale.valeur !== null ? formatDecimal(generale.valeur) : '—'}
          <span className="text-encre-clair text-[1.1rem]">/20</span>
        </p>
        <p className="folio mt-1">
          {mentionObtenue ?? 'aucune note enregistrée'}
          {generale.nombreNotes ? ` · ${generale.nombreNotes} notes` : ''}
        </p>

        <div className="mt-5 space-y-3">
          {parMatiere.map(({ m, moyenne }) => (
            <div key={m.code}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-menu font-semibold truncate" style={{ color: m.couleur }}>
                  {m.nomCourt}
                </span>
                <span className="chiffre text-menu font-bold">{formatDecimal(moyenne.valeur ?? NaN)}</span>
              </div>
              <div className="jauge mt-1">
                <span style={{ width: `${((moyenne.valeur ?? 0) / 20) * 100}%`, background: m.couleur }} />
              </div>
            </div>
          ))}
          {!parMatiere.length ? (
            <p className="folio">Ajoute une note depuis l’écran d’une matière.</p>
          ) : null}
        </div>
      </div>

      <div className="carte p-5 overflow-x-auto">
        <h3 className="text-intitule font-extrabold mb-3">Toutes les notes</h3>
        {notes.length ? (
          <table className="listing w-full min-w-[34rem]">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Évaluation</th>
                <th className="text-right">Note</th>
                <th className="text-right">Coef.</th>
                <th className="text-right">Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...notes]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((n) => {
                  const m = matieres.find((x) => x.code === n.code)
                  return (
                    <tr key={n.id}>
                      <td style={{ color: m?.couleur }} className="font-semibold">
                        {m?.nomCourt ?? n.code}
                      </td>
                      <td>{n.intitule}</td>
                      <td className="num font-bold">
                        {formatDecimal(n.valeur)}
                        <span className="text-folio">/{n.bareme}</span>
                      </td>
                      <td className="num">{n.coefficient}</td>
                      <td className="num folio">{formatDateCourte(n.date)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => supprimer(n.id)}
                          className="folio lien-souligne hover:text-debit"
                          aria-label={`Supprimer ${n.intitule}`}
                        >
                          suppr.
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        ) : (
          <p className="folio py-3">Aucune note. Ouvre une matière pour en ajouter une.</p>
        )}
      </div>
    </div>
  )
}

// ── Réglages ────────────────────────────────────────────────────────────────

export function VueReglages({
  etatNotifications,
  onActiverNotifications,
}: {
  etatNotifications: 'indisponible' | 'refusee' | 'a-demander' | 'active'
  onActiverNotifications: () => void
}) {
  const dateExamen = useRegistre((s) => s.dateExamen)
  const definirDateExamen = useRegistre((s) => s.definirDateExamen)
  const semestre = useRegistre((s) => s.semestre)
  const quinzaine = useRegistre((s) => s.quinzaine)
  const definirPeriode = useRegistre((s) => s.definirPeriode)
  const rappelMinutes = useRegistre((s) => s.rappelMinutes)
  const definirRappelMinutes = useRegistre((s) => s.definirRappelMinutes)
  const rappelsSysteme = useRegistre((s) => s.rappelsSysteme)
  const definirRappelsSysteme = useRegistre((s) => s.definirRappelsSysteme)
  const notionDansSafari = useRegistre((s) => s.notionDansSafari)
  const definirNotionDansSafari = useRegistre((s) => s.definirNotionDansSafari)

  return (
    <div className="grid gap-5 lg:grid-cols-2 items-start max-w-[64rem]">
      <section className="carte p-5">
        <h3 className="text-intitule font-extrabold">Période en cours</h3>
        <p className="folio mt-1 leading-relaxed">
          Certains créneaux ne tombent qu’à un semestre ou qu’une semaine sur deux. Le planning
          n’affiche que ceux qui te concernent.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => definirPeriode(s, quinzaine)}
              aria-pressed={semestre === s}
              className="onglet"
            >
              Semestre {s}
            </button>
          ))}
          {(['Q1', 'Q2'] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => definirPeriode(semestre, q)}
              aria-pressed={quinzaine === q}
              className="onglet chiffre"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section className="carte p-5">
        <h3 className="text-intitule font-extrabold">Examen</h3>
        <p className="folio mt-1 leading-relaxed">
          Session de mai 2028, d’après ta page Notion « KIT DE SURVIE BTS CG ».
        </p>
        <label className="block mt-4">
          <span className="etiquette">Date de l’épreuve</span>
          <input
            type="date"
            value={dateExamen}
            onChange={(e) => definirDateExamen(e.target.value)}
            className="champ chiffre"
          />
        </label>
      </section>

      <section className="carte p-5">
        <h3 className="text-intitule font-extrabold">Rappels</h3>
        <label className="block mt-4">
          <span className="etiquette">Prévenir combien de temps avant</span>
          <select
            value={rappelMinutes}
            onChange={(e) => definirRappelMinutes(Number(e.target.value))}
            className="champ"
          >
            {[5, 10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n} minutes
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4">
          {etatNotifications === 'active' ? (
            <label className="flex items-center gap-3 text-menu">
              <input
                type="checkbox"
                checked={rappelsSysteme}
                onChange={(e) => definirRappelsSysteme(e.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              Notifications système activées
            </label>
          ) : etatNotifications === 'refusee' ? (
            <p className="folio">
              Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du
              navigateur, puis recharge la page.
            </p>
          ) : etatNotifications === 'indisponible' ? (
            <p className="folio">
              Ce navigateur ne propose pas de notifications. Sur iPhone, ajoute d’abord le site à
              l’écran d’accueil depuis Safari.
            </p>
          ) : (
            <button type="button" onClick={onActiverNotifications} className="bouton bouton-plein">
              Activer les notifications
            </button>
          )}
        </div>
      </section>

      <section className="carte p-5">
        <h3 className="text-intitule font-extrabold">Notion</h3>
        <p className="folio mt-1 leading-relaxed">
          Sur iPhone et iPad, un lien Notion est détourné vers l’application. Cette option force
          l’ouverture dans Safari.
        </p>
        <label className="flex items-center gap-3 text-menu mt-4">
          <input
            type="checkbox"
            checked={notionDansSafari}
            onChange={(e) => definirNotionDansSafari(e.target.checked)}
            style={{ accentColor: 'var(--color-accent)' }}
          />
          Ouvrir Notion dans Safari
        </label>
        <p className="folio mt-2">
          {estAppleMobile()
            ? 'Appareil Apple détecté : le réglage s’applique.'
            : 'Sans effet sur cet appareil — les liens s’ouvrent déjà dans le navigateur.'}
        </p>
      </section>
    </div>
  )
}
