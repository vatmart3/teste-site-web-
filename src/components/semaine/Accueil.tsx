import { useMemo } from 'react'
import type { Creneau, Jour, Matiere } from '../../types'
import { useRegistre, META_PLANNING } from '../../store/useRegistre'
import {
  classerDevoirs,
  consigneDuMoment,
  coursEnCours,
  etatDesMatieres,
  matiereLaMoinsRevisee,
  prochainCours,
} from '../../lib/selection'
import { moyenneGenerale } from '../../lib/moyennes'
import { formatDecimal } from '../../lib/compta'
import { formatDateCourte, formatDateLongue, formatDuree, joursRestants } from '../../lib/temps'
import { GrilleSemaine } from './GrilleSemaine'

export function Accueil({
  matieres,
  maintenant,
  creneauOuvert,
  onOuvrir,
  onAllerAuxOutils,
}: {
  matieres: Matiere[]
  maintenant: Date
  creneauOuvert: string | null
  onOuvrir: (c: Creneau) => void
  onAllerAuxOutils: () => void
}) {
  const creneaux = useRegistre((s) => s.creneaux)
  const notes = useRegistre((s) => s.notes)
  const devoirsBruts = useRegistre((s) => s.devoirs)
  const chapitresFaits = useRegistre((s) => s.chapitresFaits)
  const revisions = useRegistre((s) => s.revisions)
  const dateExamen = useRegistre((s) => s.dateExamen)
  const semestre = useRegistre((s) => s.semestre)
  const quinzaine = useRegistre((s) => s.quinzaine)
  const basculerDevoir = useRegistre((s) => s.basculerDevoir)

  const devoirs = useMemo(() => classerDevoirs(devoirsBruts, maintenant), [devoirsBruts, maintenant])
  const retards = devoirs.filter((d) => d.enRetard)
  const aujourdhui = devoirs.filter((d) => d.pourAujourdhui)

  const coefficients = useMemo(
    () => Object.fromEntries(matieres.map((m) => [m.code, m.coefficient])),
    [matieres],
  )
  const generale = moyenneGenerale(notes, coefficients)

  const etats = useMemo(
    () => etatDesMatieres(matieres, notes, devoirs, chapitresFaits, revisions, maintenant),
    [matieres, notes, devoirs, chapitresFaits, revisions, maintenant],
  )
  const moinsRevisee = matiereLaMoinsRevisee(etats)

  const cours = coursEnCours(creneaux, maintenant, semestre, quinzaine)
  const suivant = prochainCours(creneaux, maintenant, semestre, quinzaine)
  const jAvantExamen = joursRestants(dateExamen, maintenant)

  const consigne = consigneDuMoment({
    cours,
    suivant,
    devoirs,
    moinsRevisee,
    joursAvantExamen: jAvantExamen,
  })

  const matiereParCode = (code: string) => matieres.find((m) => m.code === code)

  return (
    <div>
      {/* En-tête de registre : la consigne à gauche, les compteurs en colonnes. */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-y-5 gap-x-8 px-4 sm:px-6 py-6 filet-b">
        <div className="max-w-[54ch]">
          <p className="folio mb-2">
            {formatDateLongue(maintenant)}
            {' · semestre '}
            {semestre}
            {' · '}
            {quinzaine}
          </p>
          <p
            className="leading-[1.12]"
            style={{ fontFamily: 'var(--font-titre)', fontSize: 'clamp(1.35rem, 3vw, 2.05rem)' }}
          >
            {consigne}
          </p>
          {cours ? (
            <div className="mt-4 max-w-md">
              <div className="h-[3px] bg-[color-mix(in_srgb,var(--color-filet)_75%,transparent)]">
                <div className="h-full bg-debit" style={{ width: `${Math.round(cours.avancement * 100)}%` }} />
              </div>
              <p className="folio mt-1 chiffre">
                {cours.creneau.debut.replace(':', 'h')} → {cours.creneau.fin.replace(':', 'h')} ·{' '}
                {formatDuree(cours.restantMinutes)} restantes
              </p>
            </div>
          ) : null}
        </div>

        <dl className="grid grid-cols-3 lg:flex divide-x divide-[var(--color-filet)] self-start">
          <Compteur
            libelle="Moyenne générale"
            valeur={generale.valeur !== null ? formatDecimal(generale.valeur) : '—'}
            suffixe={generale.valeur !== null ? '/20' : undefined}
            ton={generale.valeur !== null && generale.valeur < 10 ? 'debit' : 'normal'}
          />
          <Compteur
            libelle="Devoirs en retard"
            valeur={String(retards.length)}
            ton={retards.length ? 'debit' : 'normal'}
          />
          <Compteur libelle="Avant l'examen" valeur={String(jAvantExamen)} suffixe="j" ton="or" />
        </dl>
      </div>

      {/* Ce qui doit sauter aux yeux : les retards. */}
      {retards.length || aujourdhui.length ? (
        <div className={`px-4 sm:px-6 py-3 filet-b ${retards.length ? 'alerte-retard' : ''}`}>
          <ul className="flex flex-wrap gap-x-8 gap-y-1.5">
            {[...retards, ...aujourdhui].map((d) => (
              <li key={d.id} className="flex items-baseline gap-2 text-menu">
                <input
                  type="checkbox"
                  id={`acc-${d.id}`}
                  checked={d.fait}
                  onChange={() => basculerDevoir(d.id)}
                  className="accent-[var(--color-debit)]"
                />
                <label htmlFor={`acc-${d.id}`} className="font-semibold">
                  {d.intitule}
                </label>
                <span className="folio chiffre">
                  {d.code} · {formatDateCourte(d.echeance)}
                  {d.enRetard ? ` · ${Math.abs(d.joursRestants)} j de retard` : " · aujourd'hui"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* La matière la moins révisée, signalée sans emphase inutile. */}
      {moinsRevisee ? (
        <div className="px-4 sm:px-6 py-2.5 filet-b flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="folio">La moins révisée</span>
          <button
            type="button"
            onClick={() => {
              const c = creneaux.find((x) => x.code === moinsRevisee.matiere.code)
              if (c) onOuvrir(c)
              else onAllerAuxOutils()
            }}
            className="text-menu font-semibold lien-souligne"
          >
            {moinsRevisee.matiere.nom}
          </button>
          <span className="folio chiffre">
            {moinsRevisee.derniereRevision
              ? `dernière ouverture il y a ${moinsRevisee.joursSansRevision} j`
              : 'jamais ouverte'}
            {' · '}
            {moinsRevisee.chapitresFaits}/{moinsRevisee.chapitresTotal} chapitres
            {moinsRevisee.matiere.epreuve ? ` · ${moinsRevisee.matiere.epreuve} coef. ${moinsRevisee.matiere.coefficient}` : ''}
          </span>
        </div>
      ) : null}

      <GrilleSemaine
        creneaux={creneaux}
        matieres={matieres}
        jours={joursAffiches(creneaux, META_PLANNING.jours)}
        bornes={META_PLANNING.bornes}
        amplitude={META_PLANNING.amplitude}
        maintenant={maintenant}
        semestre={semestre}
        quinzaine={quinzaine}
        creneauOuvert={creneauOuvert}
        onOuvrir={onOuvrir}
      />

      {suivant ? (
        <p className="px-4 sm:px-6 py-3 folio chiffre">
          Ensuite : {suivant.creneau.matiere} — {suivant.memeJour ? "aujourd'hui" : suivant.jour} à{' '}
          {suivant.creneau.debut.replace(':', 'h')}
          {suivant.creneau.salle ? ` en ${suivant.creneau.salle}` : ''}
          {matiereParCode(suivant.creneau.code)?.professeur
            ? ` · ${suivant.creneau.professeur}`
            : ''}
        </p>
      ) : null}
    </div>
  )
}

/** On n'affiche le samedi que s'il porte au moins un cours. */
function joursAffiches(creneaux: Creneau[], tous: Jour[]): Jour[] {
  return tous.filter((j) => j !== 'samedi' || creneaux.some((c) => c.jour === 'samedi'))
}

function Compteur({
  libelle,
  valeur,
  suffixe,
  ton = 'normal',
}: {
  libelle: string
  valeur: string
  suffixe?: string
  ton?: 'normal' | 'debit' | 'or'
}) {
  const couleur = ton === 'debit' ? 'text-debit' : ton === 'or' ? 'text-or' : 'text-encre'
  return (
    <div className="px-3 sm:px-5 first:pl-0 last:pr-0">
      <dt className="folio lg:whitespace-nowrap">{libelle}</dt>
      <dd className={`chiffre leading-none mt-1 ${couleur}`} style={{ fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)' }}>
        {valeur}
        {suffixe ? <span className="text-folio ml-0.5">{suffixe}</span> : null}
      </dd>
    </div>
  )
}
