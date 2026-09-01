import type { Matiere } from '../../types'
import { META_PLANNING } from '../../store/useRegistre'
import {
  IconeCalendrier,
  IconeCoche,
  IconeLivre,
  IconeNote,
  IconeOutils,
  IconeReglages,
  IconeChevron,
} from './Icones'

export type Vue = 'planning' | 'matieres' | 'devoirs' | 'notes' | 'outils' | 'edition' | 'reglages'

const PRINCIPAL: { id: Vue; libelle: string; Icone: typeof IconeCalendrier }[] = [
  { id: 'planning', libelle: 'Planning', Icone: IconeCalendrier },
  { id: 'matieres', libelle: 'Matières', Icone: IconeLivre },
  { id: 'devoirs', libelle: 'Devoirs', Icone: IconeCoche },
  { id: 'notes', libelle: 'Notes', Icone: IconeNote },
]

const AUTRES: { id: Vue; libelle: string; Icone: typeof IconeCalendrier }[] = [
  { id: 'outils', libelle: 'Outils BTS CG', Icone: IconeOutils },
  { id: 'edition', libelle: 'Emploi du temps', Icone: IconeCalendrier },
  { id: 'reglages', libelle: 'Réglages', Icone: IconeReglages },
]

export function BarreLaterale({
  vue,
  onVue,
  matieres,
  devoirsOuverts,
  devoirsEnRetard,
  moyenne,
}: {
  vue: Vue
  onVue: (v: Vue) => void
  matieres: Matiere[]
  devoirsOuverts: number
  devoirsEnRetard: number
  moyenne: string | null
}) {
  const compteurs: Partial<Record<Vue, string>> = {
    matieres: String(matieres.filter((m) => m.epreuves.length).length),
    devoirs: devoirsOuverts ? String(devoirsOuverts) : undefined,
    notes: moyenne ?? undefined,
  }

  return (
    <aside className="carte w-[248px] shrink-0 flex flex-col gap-5 p-4 bg-papier">
      {/* Identité */}
      <div className="flex items-center gap-3 px-1 pt-1">
        <div
          className="w-11 h-11 shrink-0 grid place-items-center text-[0.95rem] font-extrabold text-white"
          style={{ background: 'var(--color-accent)', borderRadius: 14 }}
        >
          RG
        </div>
        <div className="min-w-0">
          <p className="font-extrabold leading-tight">Registre</p>
          <p className="folio leading-tight">BTS Comptabilité et Gestion</p>
        </div>
      </div>

      {/* Profil */}
      <div className="cellule flex items-center gap-3 p-2.5">
        <div
          className="w-9 h-9 shrink-0 grid place-items-center font-bold text-[0.8rem] text-white"
          style={{
            background: 'linear-gradient(140deg, var(--color-accent-vif), var(--color-rose))',
            borderRadius: 999,
          }}
          aria-hidden="true"
        >
          JV
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-menu font-bold truncate">{META_PLANNING.eleve}</p>
          <p className="folio truncate">{META_PLANNING.classe} · 1ʳᵉ année</p>
        </div>
        <IconeChevron className="text-encre-clair shrink-0" />
      </div>

      <nav className="flex flex-col gap-2" aria-label="Menu principal">
        <p className="folio px-1 uppercase tracking-[0.08em]">Menu</p>
        {PRINCIPAL.map(({ id, libelle, Icone }) => (
          <button
            key={id}
            type="button"
            onClick={() => onVue(id)}
            aria-current={vue === id ? 'page' : undefined}
            className="lien-menu"
          >
            <Icone />
            <span>{libelle}</span>
            {id === 'devoirs' && devoirsEnRetard ? (
              <span
                className="compteur"
                style={{ background: 'var(--color-debit)', color: '#fff' }}
                title={`${devoirsEnRetard} en retard`}
              >
                {devoirsEnRetard}
              </span>
            ) : compteurs[id] ? (
              <span className="compteur">{compteurs[id]}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <nav className="flex flex-col gap-2" aria-label="Autres">
        <p className="folio px-1 uppercase tracking-[0.08em]">Autres</p>
        {AUTRES.map(({ id, libelle, Icone }) => (
          <button
            key={id}
            type="button"
            onClick={() => onVue(id)}
            aria-current={vue === id ? 'page' : undefined}
            className="lien-menu"
          >
            <Icone />
            <span>{libelle}</span>
          </button>
        ))}
      </nav>

      <p className="folio mt-auto px-1 leading-relaxed">
        <span className="chiffre">F</span> pour le plein écran.
      </p>
    </aside>
  )
}
