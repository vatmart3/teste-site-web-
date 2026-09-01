import type { ReactNode } from 'react'

export function Section({
  folio,
  titre,
  aside,
  children,
  className = '',
}: {
  folio?: string
  titre: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="flex items-baseline justify-between gap-4 filet-b pb-1.5 mb-3">
        <h2 className="text-intitule flex items-baseline gap-2.5">
          {folio ? <span className="folio">{folio}</span> : null}
          <span>{titre}</span>
        </h2>
        {aside ? <div className="text-folio text-encre-clair shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function Champ({
  etiquette,
  chiffre = false,
  className = '',
  ...props
}: { etiquette?: string; chiffre?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {etiquette ? <span className="etiquette">{etiquette}</span> : null}
      <input
        {...props}
        className={`champ ${chiffre ? 'champ-chiffre chiffre' : ''} ${className}`}
      />
    </label>
  )
}

export function Selecteur({
  etiquette,
  className = '',
  children,
  ...props
}: { etiquette?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {etiquette ? <span className="etiquette">{etiquette}</span> : null}
      <select {...props} className={`champ ${className}`}>
        {children}
      </select>
    </label>
  )
}

export function Valeur({
  libelle,
  valeur,
  unite,
  ton = 'normal',
}: {
  libelle: string
  valeur: string
  unite?: string
  ton?: 'normal' | 'debit' | 'credit' | 'or'
}) {
  const couleur =
    ton === 'debit'
      ? 'text-debit'
      : ton === 'credit'
        ? 'text-credit'
        : ton === 'or'
          ? 'text-or'
          : 'text-encre'
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-[color-mix(in_srgb,var(--color-filet)_50%,transparent)]">
      <span className="text-folio text-encre-clair">{libelle}</span>
      <span className={`chiffre ${couleur} text-[0.95rem]`}>
        {valeur}
        {unite ? <span className="text-folio ml-0.5">{unite}</span> : null}
      </span>
    </div>
  )
}

export function Vide({ children }: { children: ReactNode }) {
  return (
    <p className="text-folio text-encre-clair italic py-3">{children}</p>
  )
}
