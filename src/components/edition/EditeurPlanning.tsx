import { useMemo, useState } from 'react'
import { useRegistre, META_PLANNING, MATIERES_REGISTRE } from '../../store/useRegistre'
import type { Creneau, Jour } from '../../types'
import { JOURS, enMinutes } from '../../lib/temps'
import { useCopie } from '../../lib/hooks'
import { messageTelechargement, telecharger } from '../../lib/telechargement'
import { Section } from '../ui/primitives'

const CODES = MATIERES_REGISTRE.matieres.map((m) => m.code)

const NOUVEAU: Omit<Creneau, 'id'> = {
  jour: 'lundi',
  debut: '08:00',
  fin: '09:00',
  code: 'P1',
  matiere: 'P1 Comptabilité courante',
  professeur: '',
  salle: '',
  groupe: null,
  semestre: null,
  quinzaine: null,
}

export function EditeurPlanning() {
  const creneaux = useRegistre((s) => s.creneaux)
  const ajouterCreneau = useRegistre((s) => s.ajouterCreneau)
  const modifierCreneau = useRegistre((s) => s.modifierCreneau)
  const supprimerCreneau = useRegistre((s) => s.supprimerCreneau)
  const reinitialiser = useRegistre((s) => s.reinitialiserPlanning)
  const semestre = useRegistre((s) => s.semestre)
  const quinzaine = useRegistre((s) => s.quinzaine)
  const definirPeriode = useRegistre((s) => s.definirPeriode)

  const [brouillon, setBrouillon] = useState<Omit<Creneau, 'id'>>(NOUVEAU)
  const [filtre, setFiltre] = useState<Jour | 'tous'>('tous')
  const [copie, copier] = useCopie()
  const [etatExport, setEtatExport] = useState('')

  const listeTriee = useMemo(
    () =>
      [...creneaux]
        .filter((c) => filtre === 'tous' || c.jour === filtre)
        .sort(
          (a, b) =>
            JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour) || enMinutes(a.debut) - enMinutes(b.debut),
        ),
    [creneaux, filtre],
  )

  const exporterJson = async () => {
    const contenu = JSON.stringify(
      {
        meta: META_PLANNING,
        creneaux: [...creneaux].sort(
          (a, b) =>
            JOURS.indexOf(a.jour) - JOURS.indexOf(b.jour) || enMinutes(a.debut) - enMinutes(b.debut),
        ),
      },
      null,
      2,
    )
    const r = await telecharger('planning.json', contenu, 'application/json')
    setEtatExport(messageTelechargement(r, 'planning.json'))
  }

  const invalide = enMinutes(brouillon.fin) <= enMinutes(brouillon.debut)

  return (
    <div className="px-4 sm:px-6 py-6 space-y-9">
      <Section folio="PER" titre="Période en cours">
        <p className="text-menu text-encre-clair mb-3 max-w-[62ch]">
          Certains créneaux ne tombent qu'à un semestre ou qu'une semaine sur deux. Règle ici la
          période : la vue Semaine et le mode Focus n'afficheront que les cours qui te concernent.
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="filet border flex">
            {([1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => definirPeriode(s, quinzaine)}
                aria-pressed={semestre === s}
                className={`onglet ${semestre === s ? 'bg-encre text-papier-vif' : ''}`}
              >
                Semestre {s}
              </button>
            ))}
          </div>
          <div className="filet border flex">
            {(['Q1', 'Q2'] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => definirPeriode(semestre, q)}
                aria-pressed={quinzaine === q}
                className={`onglet chiffre ${quinzaine === q ? 'bg-encre text-papier-vif' : ''}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section folio="ADD" titre="Ajouter un créneau">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (invalide) return
            ajouterCreneau({
              ...brouillon,
              professeur: brouillon.professeur?.trim() || null,
              salle: brouillon.salle?.trim() || null,
              groupe: brouillon.groupe?.trim() || null,
            })
            setBrouillon(NOUVEAU)
          }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-3 items-end"
        >
          <label className="block">
            <span className="etiquette">Jour</span>
            <select
              value={brouillon.jour}
              onChange={(e) => setBrouillon({ ...brouillon, jour: e.target.value as Jour })}
              className="champ"
            >
              {META_PLANNING.jours.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="etiquette">Début</span>
            <input type="time" value={brouillon.debut} onChange={(e) => setBrouillon({ ...brouillon, debut: e.target.value })} className="champ chiffre" />
          </label>
          <label className="block">
            <span className="etiquette">Fin</span>
            <input type="time" value={brouillon.fin} onChange={(e) => setBrouillon({ ...brouillon, fin: e.target.value })} className="champ chiffre" />
          </label>
          <label className="block">
            <span className="etiquette">Code</span>
            <select
              value={brouillon.code}
              onChange={(e) => {
                const code = e.target.value
                const mat = MATIERES_REGISTRE.matieres.find((m) => m.code === code)
                setBrouillon({ ...brouillon, code, matiere: mat?.nom ?? brouillon.matiere })
              }}
              className="champ chiffre"
            >
              {CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block col-span-2">
            <span className="etiquette">Matière affichée</span>
            <input value={brouillon.matiere} onChange={(e) => setBrouillon({ ...brouillon, matiere: e.target.value })} className="champ" />
          </label>
          <label className="block">
            <span className="etiquette">Professeur</span>
            <input value={brouillon.professeur ?? ''} onChange={(e) => setBrouillon({ ...brouillon, professeur: e.target.value })} className="champ" />
          </label>
          <label className="block">
            <span className="etiquette">Salle</span>
            <input value={brouillon.salle ?? ''} onChange={(e) => setBrouillon({ ...brouillon, salle: e.target.value })} className="champ chiffre" />
          </label>
          <label className="block col-span-2">
            <span className="etiquette">Groupe (vide = classe entière)</span>
            <input value={brouillon.groupe ?? ''} onChange={(e) => setBrouillon({ ...brouillon, groupe: e.target.value })} className="champ" placeholder={META_PLANNING.groupeTd} />
          </label>
          <label className="block">
            <span className="etiquette">Semestre</span>
            <select
              value={brouillon.semestre ?? ''}
              onChange={(e) => setBrouillon({ ...brouillon, semestre: e.target.value === '' ? null : (Number(e.target.value) as 1 | 2) })}
              className="champ"
            >
              <option value="">les deux</option>
              <option value="1">S1</option>
              <option value="2">S2</option>
            </select>
          </label>
          <label className="block">
            <span className="etiquette">Quinzaine</span>
            <select
              value={brouillon.quinzaine ?? ''}
              onChange={(e) => setBrouillon({ ...brouillon, quinzaine: e.target.value === '' ? null : (e.target.value as 'Q1' | 'Q2') })}
              className="champ"
            >
              <option value="">toutes</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
            </select>
          </label>
          <div className="col-span-2 lg:col-span-2">
            <button type="submit" className="bouton bouton-plein w-full justify-center" disabled={invalide}>
              {invalide ? 'Fin avant le début' : 'Ajouter le créneau'}
            </button>
          </div>
        </form>
      </Section>

      <Section
        folio="EDT"
        titre="Tous les créneaux"
        aside={<span className="chiffre">{creneaux.length} au total</span>}
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="filet border flex flex-wrap">
            <button type="button" onClick={() => setFiltre('tous')} aria-pressed={filtre === 'tous'} className={`onglet ${filtre === 'tous' ? 'bg-encre text-papier-vif' : ''}`}>
              tous
            </button>
            {META_PLANNING.jours.map((j) => (
              <button key={j} type="button" onClick={() => setFiltre(j)} aria-pressed={filtre === j} className={`onglet ${filtre === j ? 'bg-encre text-papier-vif' : ''}`}>
                {j}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void exporterJson()} className="bouton bouton-discret">
            Télécharger planning.json
          </button>
          <button
            type="button"
            onClick={() => copier(JSON.stringify(creneaux, null, 2))}
            className="bouton bouton-discret"
          >
            {copie ? 'Copié' : 'Copier les créneaux'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Revenir au planning livré avec le site ? Tes modifications de créneaux seront perdues (notes, devoirs et bloc-notes sont conservés).')) {
                reinitialiser()
              }
            }}
            className="bouton bouton-discret bouton-danger"
          >
            Réinitialiser
          </button>
          <p className="folio" aria-live="polite">
            {etatExport}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="listing w-full min-w-[52rem]">
            <thead>
              <tr>
                <th className="w-[6.5rem]">Jour</th>
                <th className="w-[5.5rem]">Début</th>
                <th className="w-[5.5rem]">Fin</th>
                <th className="w-[6rem]">Code</th>
                <th>Matière</th>
                <th className="w-[9rem]">Professeur</th>
                <th className="w-[6rem]">Salle</th>
                <th className="w-[9rem]">Groupe</th>
                <th className="w-[5rem]">Sem.</th>
                <th className="w-[5rem]">Quinz.</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {listeTriee.map((c) => (
                <tr key={c.id}>
                  <td>
                    <select value={c.jour} onChange={(e) => modifierCreneau(c.id, { jour: e.target.value as Jour })} className="champ" aria-label="Jour">
                      {META_PLANNING.jours.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </td>
                  <td><input type="time" value={c.debut} onChange={(e) => modifierCreneau(c.id, { debut: e.target.value })} className="champ chiffre" aria-label="Heure de début" /></td>
                  <td><input type="time" value={c.fin} onChange={(e) => modifierCreneau(c.id, { fin: e.target.value })} className="champ chiffre" aria-label="Heure de fin" /></td>
                  <td>
                    <select value={c.code} onChange={(e) => modifierCreneau(c.id, { code: e.target.value })} className="champ chiffre" aria-label="Code matière">
                      {CODES.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </td>
                  <td><input value={c.matiere} onChange={(e) => modifierCreneau(c.id, { matiere: e.target.value })} className="champ" aria-label="Matière" /></td>
                  <td><input value={c.professeur ?? ''} onChange={(e) => modifierCreneau(c.id, { professeur: e.target.value || null })} className="champ" aria-label="Professeur" /></td>
                  <td><input value={c.salle ?? ''} onChange={(e) => modifierCreneau(c.id, { salle: e.target.value || null })} className="champ chiffre" placeholder="—" aria-label="Salle" /></td>
                  <td><input value={c.groupe ?? ''} onChange={(e) => modifierCreneau(c.id, { groupe: e.target.value || null })} className="champ" placeholder="classe" aria-label="Groupe" /></td>
                  <td>
                    <select value={c.semestre ?? ''} onChange={(e) => modifierCreneau(c.id, { semestre: e.target.value === '' ? null : (Number(e.target.value) as 1 | 2) })} className="champ" aria-label="Semestre">
                      <option value="">—</option>
                      <option value="1">S1</option>
                      <option value="2">S2</option>
                    </select>
                  </td>
                  <td>
                    <select value={c.quinzaine ?? ''} onChange={(e) => modifierCreneau(c.id, { quinzaine: e.target.value === '' ? null : (e.target.value as 'Q1' | 'Q2') })} className="champ" aria-label="Quinzaine">
                      <option value="">—</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                    </select>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => supprimerCreneau(c.id)}
                      className="folio lien-souligne hover:text-debit"
                      aria-label={`Supprimer ${c.matiere} du ${c.jour} ${c.debut}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-folio text-encre-clair mt-3 max-w-[70ch]">
          Les modifications sont enregistrées dans ton navigateur immédiatement. Pour qu'elles
          deviennent la version de référence du site (et survivent à un changement de machine),
          télécharge <span className="chiffre">planning.json</span> et remplace le fichier
          <span className="chiffre"> src/data/planning.json</span> du dépôt.
        </p>
      </Section>
    </div>
  )
}
