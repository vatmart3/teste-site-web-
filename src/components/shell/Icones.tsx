/** Petites icônes au trait, dessinées à la main pour éviter une dépendance. */
type Props = { className?: string }

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconeCalendrier = ({ className }: Props) => (
  <svg {...base} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)

export const IconeLivre = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z" />
    <path d="M4 19.5A1.5 1.5 0 0 1 5.5 21H19" />
  </svg>
)

export const IconeCoche = ({ className }: Props) => (
  <svg {...base} className={className}>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M8 12.5l2.6 2.6L16 9.5" />
  </svg>
)

export const IconeNote = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M5 21V6.5A2.5 2.5 0 0 1 7.5 4H19v17z" />
    <path d="M9 9h6M9 13h6M9 17h3" />
  </svg>
)

export const IconeOutils = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 9.7 14.3 3z" />
    <path d="M12.5 8.5 3 18v3h3l9.5-9.5" />
  </svg>
)

export const IconeReglages = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
  </svg>
)

export const IconeLoupe = ({ className }: Props) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconeCloche = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M10.5 19a2 2 0 0 0 3 0" />
  </svg>
)

export const IconeChevron = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const IconeFleche = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const IconeMenu = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
)

export const IconeHorloge = ({ className }: Props) => (
  <svg {...base} className={className} width={14} height={14}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const IconeLien = ({ className }: Props) => (
  <svg {...base} className={className}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
)

export const IconePoint = ({ className }: Props) => (
  <svg {...base} className={className} width={16} height={16}>
    <circle cx="12" cy="6" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="18" r="1.4" fill="currentColor" />
  </svg>
)
