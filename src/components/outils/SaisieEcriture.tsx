import { useMemo, useRef, useState } from 'react'
import { chercherComptes, trouverCompte } from '../../data/pcg'
import { SCHEMAS } from '../../data/schemas'
import { TAUX_TVA, arrondi, depuisHt, formatEuro } from '../../lib/compta'
import { Section } from '../ui/primitives'

interface LigneSaisie {
  id: string
  compte: string
  libelle: string
  debit: string
  credit: string
}

const vide = (): LigneSaisie => ({
  id: Math.random().toString(36).slice(2, 9),
  compte: '',
  libelle: '',
  debit: '',
  credit: '',
})

function nombre(v: string): number {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function SaisieEcriture() {
  const [lignes, setLignes] = useState<LigneSaisie[]>([vide(), vide(), vide()])
  const [base, setBase] = useState('1000')
  const [taux, setTaux] = useState<number>(20)
  const [schemaCharge, setSchemaCharge] = useState<string>('')

  const totalDebit = arrondi(lignes.reduce((s, l) => s + nombre(l.debit), 0))
  const totalCredit = arrondi(lignes.reduce((s, l) => s + nombre(l.credit), 0))
  const ecart = arrondi(totalDebit - totalCredit)
  const equilibre = ecart === 0 && totalDebit > 0

  const modifier = (id: string, patch: Partial<LigneSaisie>) =>
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  const chargerSchema = (idSchema: string) => {
    setSchemaCharge(idSchema)
    const schema = SCHEMAS.find((s) => s.id === idSchema)
    if (!schema) return
    const b = nombre(base)
    const r = depuisHt(b, taux)
    const nouvelles = schema.lignes.map((l) => {
      const montant =
        l.montant.mode === 'base'
          ? r.ht
          : l.montant.mode === 'tva'
            ? r.tva
            : l.montant.mode === 'ttc'
              ? r.ttc
              : null
      const texte = montant === null ? '' : formatEuro(montant)
      return {
        id: Math.random().toString(36).slice(2, 9),
        compte: l.compte,
        libelle: l.libelle,
        debit: l.sens === 'debit' ? texte : '',
        credit: l.sens === 'credit' ? texte : '',
      }
    })
    setLignes([...nouvelles, vide()])
  }

  const schema = SCHEMAS.find((s) => s.id === schemaCharge)
  const familles = [...new Set(SCHEMAS.map((s) => s.famille))]

  return (
    <Section
      folio="JRN"
      titre="Saisie d'écriture"
      aside={
        <span className="chiffre">
          {lignes.filter((l) => l.compte).length} ligne
          {lignes.filter((l) => l.compte).length > 1 ? 's' : ''}
        </span>
      }
    >
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 mb-5 filet-b pb-4">
        <div className="w-36">
          <label className="etiquette" htmlFor="ecr-base">
            Montant HT de base
          </label>
          <input
            id="ecr-base"
            inputMode="decimal"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            className="champ champ-chiffre chiffre"
          />
        </div>
        <div className="filet border flex">
          {TAUX_TVA.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTaux(t)}
              aria-pressed={taux === t}
              className={`onglet chiffre ${taux === t ? 'bg-encre text-papier-vif' : ''}`}
            >
              {String(t).replace('.', ',')} %
            </button>
          ))}
        </div>
        <div className="min-w-[16rem] flex-1">
          <label className="etiquette" htmlFor="ecr-schema">
            Charger un schéma type
          </label>
          <select
            id="ecr-schema"
            value={schemaCharge}
            onChange={(e) => chargerSchema(e.target.value)}
            className="champ"
          >
            <option value="">— écriture vierge —</option>
            {familles.map((f) => (
              <optgroup key={f} label={f}>
                {SCHEMAS.filter((s) => s.famille === f).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => { setLignes([vide(), vide(), vide()]); setSchemaCharge('') }} className="bouton bouton-discret">
          Vider
        </button>
      </div>

      {schema ? (
        <p className="text-menu filet border-l-4 border-l-[var(--color-or)] pl-3 py-2 mb-4 bg-[color-mix(in_srgb,var(--color-or)_8%,transparent)]">
          {schema.commentaire}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="listing w-full min-w-[38rem]">
          <thead>
            <tr>
              <th className="w-[9rem]">Compte</th>
              <th>Libellé</th>
              <th className="w-[8rem] text-right sens-debit">Débit</th>
              <th className="w-[8rem] text-right sens-credit">Crédit</th>
              <th className="w-8" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id}>
                <td className="align-top">
                  <ChampCompte
                    valeur={l.compte}
                    onChoisir={(numero, intitule) =>
                      modifier(l.id, { compte: numero, libelle: l.libelle || intitule })
                    }
                  />
                </td>
                <td className="align-top">
                  <input
                    value={l.libelle}
                    onChange={(e) => modifier(l.id, { libelle: e.target.value })}
                    className="champ"
                    aria-label="Libellé de la ligne"
                    placeholder={trouverCompte(l.compte)?.intitule ?? ''}
                  />
                </td>
                <td className="align-top">
                  <input
                    inputMode="decimal"
                    value={l.debit}
                    onChange={(e) => modifier(l.id, { debit: e.target.value, credit: '' })}
                    className="champ champ-chiffre chiffre"
                    aria-label="Montant au débit"
                  />
                </td>
                <td className="align-top">
                  <input
                    inputMode="decimal"
                    value={l.credit}
                    onChange={(e) => modifier(l.id, { credit: e.target.value, debit: '' })}
                    className="champ champ-chiffre chiffre"
                    aria-label="Montant au crédit"
                  />
                </td>
                <td className="align-top text-right">
                  <button
                    type="button"
                    onClick={() => setLignes((ls) => (ls.length > 1 ? ls.filter((x) => x.id !== l.id) : ls))}
                    className="folio lien-souligne hover:text-debit"
                    aria-label="Supprimer la ligne"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="filet-double-b">
              <td colSpan={2} className="pt-2 text-menu font-bold">
                Totaux
              </td>
              <td className="num pt-2 text-[1.05rem] font-bold sens-debit">{formatEuro(totalDebit)}</td>
              <td className="num pt-2 text-[1.05rem] font-bold sens-credit">{formatEuro(totalCredit)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4">
        <button type="button" onClick={() => setLignes((ls) => [...ls, vide()])} className="bouton bouton-discret">
          Ajouter une ligne
        </button>
        <p
          aria-live="polite"
          className={`chiffre px-3 py-1.5 border text-menu font-semibold transition-colors duration-200 ${
            equilibre
              ? 'balance-equilibree'
              : totalDebit === 0 && totalCredit === 0
                ? 'balance-neutre'
                : 'balance-desequilibree'
          }`}
        >
          {equilibre
            ? `Écriture équilibrée — ${formatEuro(totalDebit)}`
            : totalDebit === 0 && totalCredit === 0
              ? 'En attente de saisie'
              : `Déséquilibre de ${formatEuro(Math.abs(ecart))} ${ecart > 0 ? 'au débit' : 'au crédit'}`}
        </p>
      </div>
    </Section>
  )
}

function ChampCompte({
  valeur,
  onChoisir,
}: {
  valeur: string
  onChoisir: (numero: string, intitule: string) => void
}) {
  const [texte, setTexte] = useState(valeur)
  const [ouvert, setOuvert] = useState(false)
  const [index, setIndex] = useState(0)
  const bloc = useRef<HTMLDivElement>(null)

  const propositions = useMemo(
    () => (texte.trim() ? chercherComptes(texte).slice(0, 7) : []),
    [texte],
  )

  const choisir = (i: number) => {
    const c = propositions[i]
    if (!c) return
    setTexte(c.numero)
    onChoisir(c.numero, c.intitule)
    setOuvert(false)
  }

  return (
    <div ref={bloc} className="relative">
      <input
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value)
          setOuvert(true)
          setIndex(0)
          onChoisir(e.target.value, '')
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => window.setTimeout(() => setOuvert(false), 130)}
        onKeyDown={(e) => {
          if (!ouvert || !propositions.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setIndex((i) => Math.min(i + 1, propositions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setIndex((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            choisir(index)
          } else if (e.key === 'Escape') {
            setOuvert(false)
          }
        }}
        role="combobox"
        aria-expanded={ouvert && propositions.length > 0}
        aria-autocomplete="list"
        aria-controls="liste-comptes"
        aria-label="Numéro de compte"
        placeholder="401…"
        className="champ champ-chiffre chiffre text-left"
        autoComplete="off"
      />
      {ouvert && propositions.length ? (
        <ul
          id="liste-comptes"
          role="listbox"
          className="absolute z-30 left-0 top-full min-w-[22rem] max-w-[26rem] bg-papier-vif filet border shadow-[2px_3px_0_0_color-mix(in_srgb,var(--color-encre)_22%,transparent)]"
        >
          {propositions.map((c, i) => (
            <li key={c.numero} role="option" aria-selected={i === index}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisir(i)}
                onMouseEnter={() => setIndex(i)}
                className={`w-full text-left px-2 py-1 text-menu flex gap-2 ${
                  i === index ? 'bg-[color-mix(in_srgb,var(--color-or)_25%,transparent)]' : ''
                }`}
              >
                <span className="chiffre font-semibold w-[4.5rem] shrink-0">{c.numero}</span>
                <span className="truncate">{c.intitule}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
