import type { Creneau, Jour, Matiere } from '../../types'
import type { DevoirClasse } from '../../lib/selection'
import { enMinutes, formatDateCourte, formatDuree } from '../../lib/temps'
import { IconeHorloge, IconePoint } from './Icones'

export interface EntreeCours {
  creneau: Creneau
  jour: Jour
  /** Minutes avant le début ; null si ce n'est pas aujourd'hui. */
  dans: number | null
  enCours: boolean
  avancement: number
}

/**
 * La colonne de droite : ce qui arrive, puis ce qu'il reste à rendre.
 * Chaque ligne mène à l'écran de la matière.
 */
export function PanneauDroit({
  cours,
  devoirs,
  matieres,
  chapitresFaits,
  onOuvrir,
  onOuvrirDevoirs,
}: {
  cours: EntreeCours[]
  devoirs: DevoirClasse[]
  matieres: Matiere[]
  chapitresFaits: Record<string, string[]>
  onOuvrir: (c: Creneau) => void
  onOuvrirDevoirs: () => void
}) {
  const parCode = Object.fromEntries(matieres.map((m) => [m.code, m]))
  const enRetard = devoirs.filter((d) => d.enRetard)
  const aVenir = devoirs.filter((d) => !d.fait && !d.enRetard).slice(0, 4)

  return (
    <aside className="carte w-[320px] shrink-0 flex flex-col gap-6 p-5 overflow-y-auto">
      <section>
        <h2 className="text-intitule font-extrabold">Ce qui arrive</h2>
        <p className="folio mt-0.5">Les prochains cours, dans l’ordre.</p>

        <div className="mt-3">
          {cours.length ? (
            cours.map((e) => {
              const m = parCode[e.creneau.code]
              const couleur = m?.couleur ?? 'var(--color-accent)'
              const total = m?.chapitres.length ?? 0
              const faits = (chapitresFaits[e.creneau.code] ?? []).length
              const duree = enMinutes(e.creneau.fin) - enMinutes(e.creneau.debut)
              return (
                <button
                  key={`${e.jour}-${e.creneau.id}`}
                  type="button"
                  onClick={() => onOuvrir(e.creneau)}
                  className="ligne-panneau"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="folio">
                      {e.enCours ? 'en ce moment' : e.dans !== null ? `dans ${formatDuree(e.dans)}` : e.jour}
                    </span>
                    <IconePoint className="text-encre-clair" />
                  </span>

                  <span className="flex items-baseline justify-between gap-3 mt-1">
                    <span className="anton text-[1.05rem] truncate" style={{ color: couleur }}>
                      {m?.nomCourt ?? e.creneau.matiere}
                    </span>
                    <span className="chiffre text-menu font-bold shrink-0">
                      {e.creneau.salle ?? '—'}
                    </span>
                  </span>

                  <span className="flex items-center justify-between gap-3 mt-1.5">
                    <span className="flex items-center gap-1.5 folio">
                      <IconeHorloge />
                      <span className="chiffre">
                        {e.creneau.debut.replace(':', 'h')} – {e.creneau.fin.replace(':', 'h')}
                      </span>
                    </span>
                    <span className="folio chiffre">{formatDuree(duree)}</span>
                  </span>

                  {e.enCours ? (
                    <>
                      <span className="jauge block mt-2.5">
                        <span
                          style={{ width: `${Math.round(e.avancement * 100)}%`, background: couleur }}
                        />
                      </span>
                      <span className="folio block text-right mt-1">
                        {formatDuree((1 - e.avancement) * duree)} restantes
                      </span>
                    </>
                  ) : total ? (
                    <>
                      <span className="jauge block mt-2.5">
                        <span style={{ width: `${(faits / total) * 100}%`, background: couleur }} />
                      </span>
                      <span className="folio block text-right mt-1">
                        {total - faits} chapitre{total - faits > 1 ? 's' : ''} à revoir
                      </span>
                    </>
                  ) : null}
                </button>
              )
            })
          ) : (
            <p className="folio py-3">Plus aucun cours cette semaine.</p>
          )}
        </div>
      </section>

      <section className="filet-t pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-intitule font-extrabold">À rendre</h2>
          <button type="button" onClick={onOuvrirDevoirs} className="folio lien-souligne">
            tout voir
          </button>
        </div>

        {enRetard.length ? (
          <div className="alerte-retard mt-3 px-3 py-2.5">
            <p className="text-menu font-bold text-debit">
              {enRetard.length} en retard
            </p>
            <ul className="mt-1 space-y-0.5">
              {enRetard.slice(0, 3).map((d) => (
                <li key={d.id} className="folio">
                  {d.intitule} — <span className="chiffre">{Math.abs(d.joursRestants)} j</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-2">
          {aVenir.length ? (
            aVenir.map((d) => {
              const m = parCode[d.code]
              return (
                <div key={d.id} className="ligne-panneau cursor-default hover:opacity-100">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="folio">{formatDateCourte(d.echeance)}</span>
                    <span
                      className="folio font-bold"
                      style={{ color: m?.couleur ?? 'var(--color-encre-clair)' }}
                    >
                      {d.code}
                    </span>
                  </p>
                  <p className="text-menu font-semibold mt-0.5">{d.intitule}</p>
                  <p className="folio mt-0.5">
                    {d.pourAujourdhui
                      ? "pour aujourd'hui"
                      : `dans ${d.joursRestants} jour${d.joursRestants > 1 ? 's' : ''}`}
                  </p>
                </div>
              )
            })
          ) : enRetard.length ? null : (
            <p className="folio py-3">Rien à rendre. Profites-en pour ficher.</p>
          )}
        </div>
      </section>
    </aside>
  )
}
